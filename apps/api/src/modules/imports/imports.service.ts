import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SuppressionsService } from '../suppressions/suppressions.service';
import { AuditAction } from '@prisma/client';
import { normalizePhoneNumber, isValidPhoneNumber } from '@eventblast/shared';
import * as xlsx from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

export interface ColumnMapping {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  designation?: string;
  customFields?: Record<string, string>;
}

export interface ImportOptions {
  columnMapping: ColumnMapping;
  defaultGroupId?: string;
  marketingOptIn?: boolean;
  optInSource?: string;
}

@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private suppressionsService: SuppressionsService,
  ) {}

  /**
   * Parses uploaded CSV or XLSX file and extracts headers and sample rows.
   */
  parseFile(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded or file buffer is empty');
    }

    let rows: Record<string, any>[] = [];

    const isCsv = file.mimetype.includes('csv') || file.originalname.endsWith('.csv');
    const isXlsx =
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls');

    if (isCsv) {
      const fileContent = file.buffer.toString('utf-8');
      rows = csvParse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (isXlsx) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      throw new BadRequestException('Unsupported file format. Please upload CSV or XLSX');
    }

    if (rows.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const headers = Object.keys(rows[0]);

    // Auto-detect suggested column mappings
    const suggestedMapping: Partial<ColumnMapping> = {};
    for (const h of headers) {
      const lower = h.toLowerCase().trim();
      if (lower === 'full name' || lower === 'fullname' || lower === 'name') {
        suggestedMapping.fullName = h;
      } else if (lower === 'first name' || lower === 'firstname') {
        suggestedMapping.firstName = h;
      } else if (lower === 'last name' || lower === 'lastname') {
        suggestedMapping.lastName = h;
      } else if (
        lower === 'phone' ||
        lower === 'mobile' ||
        lower === 'phone number' ||
        lower === 'contact' ||
        lower === 'whatsapp'
      ) {
        suggestedMapping.phoneNumber = h;
      } else if (lower === 'email' || lower === 'email address') {
        suggestedMapping.email = h;
      } else if (lower === 'company' || lower === 'organization' || lower === 'business') {
        suggestedMapping.company = h;
      } else if (lower === 'designation' || lower === 'title' || lower === 'role') {
        suggestedMapping.designation = h;
      }
    }

    return {
      totalRows: rows.length,
      headers,
      suggestedMapping,
      previewRows: rows.slice(0, 5),
      rawRows: rows,
    };
  }

  /**
   * Executes the import mapping, validating phone numbers and filtering against suppression.
   */
  async processImport(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    options: ImportOptions,
  ) {
    const { rawRows } = this.parseFile(file);
    const mapping = options.columnMapping;

    if (!mapping.phoneNumber) {
      throw new BadRequestException('Phone number column mapping is required');
    }

    // Load existing phone numbers in organization to detect duplicates
    const existingContacts = await this.prisma.contact.findMany({
      where: { organizationId },
      select: { phoneNumber: true },
    });
    const existingPhoneSet = new Set(existingContacts.map((c) => c.phoneNumber));

    // Load suppression list
    const suppressedEntries = await this.prisma.suppressionEntry.findMany({
      where: { organizationId },
      select: { phoneNumber: true },
    });
    const suppressedPhoneSet = new Set(suppressedEntries.map((s) => s.phoneNumber));

    const validToInsert: any[] = [];
    const duplicates: any[] = [];
    const invalidNumbers: any[] = [];
    const suppressedNumbers: any[] = [];
    const seenInFile = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rawPhone = String(row[mapping.phoneNumber] || '').trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);

      if (!rawPhone || !isValidPhoneNumber(normalizedPhone)) {
        invalidNumbers.push({ row: i + 2, rawPhone, reason: 'Invalid or missing phone number' });
        continue;
      }

      if (seenInFile.has(normalizedPhone)) {
        duplicates.push({ row: i + 2, phone: normalizedPhone, reason: 'Duplicate in uploaded file' });
        continue;
      }
      seenInFile.add(normalizedPhone);

      if (existingPhoneSet.has(normalizedPhone)) {
        duplicates.push({ row: i + 2, phone: normalizedPhone, reason: 'Already exists in database' });
        continue;
      }

      if (suppressedPhoneSet.has(normalizedPhone)) {
        suppressedNumbers.push({ row: i + 2, phone: normalizedPhone, reason: 'In suppression / opt-out list' });
        continue;
      }

      let fullName = mapping.fullName ? String(row[mapping.fullName] || '').trim() : '';
      let firstName = mapping.firstName ? String(row[mapping.firstName] || '').trim() : '';
      let lastName = mapping.lastName ? String(row[mapping.lastName] || '').trim() : '';

      if (!fullName && firstName) {
        fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;
      } else if (fullName && !firstName) {
        const parts = fullName.split(' ');
        firstName = parts[0] || 'Guest';
        lastName = parts.slice(1).join(' ') || '';
      } else if (!fullName && !firstName) {
        firstName = 'Guest';
        fullName = 'Guest';
      }

      const email = mapping.email ? String(row[mapping.email] || '').trim() : null;
      const company = mapping.company ? String(row[mapping.company] || '').trim() : null;
      const designation = mapping.designation ? String(row[mapping.designation] || '').trim() : null;

      const customFields: Record<string, any> = {};
      if (mapping.customFields) {
        for (const [key, colName] of Object.entries(mapping.customFields)) {
          customFields[key] = row[colName];
        }
      }

      validToInsert.push({
        organizationId,
        firstName,
        lastName: lastName || null,
        fullName,
        phoneNumber: normalizedPhone,
        email: email || null,
        company: company || null,
        designation: designation || null,
        source: 'CSV_IMPORT',
        marketingOptIn: options.marketingOptIn ?? true,
        optInSource: options.optInSource || 'CSV_IMPORT',
        optInAt: new Date(),
        optedOut: false,
        customFields,
      });
    }

    // Batch insert contacts
    let insertedCount = 0;
    if (validToInsert.length > 0) {
      // Insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < validToInsert.length; i += chunkSize) {
        const chunk = validToInsert.slice(i, i + chunkSize);
        await this.prisma.contact.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
      insertedCount = validToInsert.length;

      // If default group provided, associate all inserted contacts
      if (options.defaultGroupId) {
        const insertedContacts = await this.prisma.contact.findMany({
          where: {
            organizationId,
            phoneNumber: { in: validToInsert.map((c) => c.phoneNumber) },
          },
          select: { id: true },
        });

        await this.prisma.contactGroupMember.createMany({
          data: insertedContacts.map((c) => ({
            groupId: options.defaultGroupId!,
            contactId: c.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CONTACT_IMPORT,
      resourceType: 'Contact',
      metadata: {
        totalRows: rawRows.length,
        insertedCount,
        duplicatesCount: duplicates.length,
        invalidCount: invalidNumbers.length,
        suppressedCount: suppressedNumbers.length,
        defaultGroupId: options.defaultGroupId,
      },
    });

    return {
      totalRows: rawRows.length,
      insertedCount,
      duplicatesCount: duplicates.length,
      invalidCount: invalidNumbers.length,
      suppressedCount: suppressedNumbers.length,
      errors: {
        duplicates,
        invalidNumbers,
        suppressedNumbers,
      },
    };
  }
}
