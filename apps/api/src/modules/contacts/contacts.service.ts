import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SuppressionsService } from '../suppressions/suppressions.service';
import { AuditAction } from '@prisma/client';
import { normalizePhoneNumber, isValidPhoneNumber } from '@eventblast/shared';
import { CreateContactSchema, UpdateContactSchema } from '@eventblast/validation';
import { z } from 'zod';
import * as XLSX from 'xlsx';

export interface ListContactsQuery {
  page?: number;
  limit?: number;
  search?: string;
  groupId?: string;
  marketingOptIn?: boolean;
  optedOut?: boolean;
  company?: string;
}

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private suppressionsService: SuppressionsService,
  ) {}

  async list(organizationId: string, query: ListContactsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phoneNumber: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.groupId) {
      where.groupMembers = {
        some: { groupId: query.groupId },
      };
    }

    if (typeof query.marketingOptIn === 'boolean') {
      where.marketingOptIn = query.marketingOptIn;
    }

    if (typeof query.optedOut === 'boolean') {
      where.optedOut = query.optedOut;
    }

    if (query.company) {
      where.company = { contains: query.company, mode: 'insensitive' };
    }

    const [total, contacts] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          groupMembers: {
            include: {
              group: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const formatted = contacts.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      email: c.email,
      company: c.company,
      designation: c.designation,
      source: c.source,
      marketingOptIn: c.marketingOptIn,
      optInSource: c.optInSource,
      optInAt: c.optInAt,
      optedOut: c.optedOut,
      optedOutAt: c.optedOutAt,
      customFields: c.customFields,
      groups: c.groupMembers.map((gm) => gm.group),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      items: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      include: {
        groupMembers: {
          include: {
            group: true,
          },
        },
        eventGuests: {
          include: {
            event: {
              select: { id: true, name: true, startAt: true, venueName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        campaignMessages: {
          include: {
            campaign: {
              select: { id: true, name: true, campaignType: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return {
      ...contact,
      groups: contact.groupMembers.map((gm) => gm.group),
      events: contact.eventGuests.map((eg) => ({
        guestId: eg.id,
        eventId: eg.eventId,
        eventName: eg.event.name,
        eventDate: eg.event.startAt,
        venue: eg.event.venueName,
        invitationStatus: eg.invitationStatus,
        rsvpStatus: eg.rsvpStatus,
        respondedAt: eg.respondedAt,
        checkedInAt: eg.checkedInAt,
      })),
      campaignHistory: contact.campaignMessages.map((cm) => ({
        messageId: cm.id,
        campaignId: cm.campaignId,
        campaignName: cm.campaign.name,
        status: cm.status,
        sentAt: cm.sentAt,
        deliveredAt: cm.deliveredAt,
        readAt: cm.readAt,
      })),
    };
  }

  async create(organizationId: string, userId: string, payload: z.infer<typeof CreateContactSchema>) {
    const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
    if (!isValidPhoneNumber(normalizedPhone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Check suppression list
    const isSuppressed = await this.suppressionsService.isSuppressed(organizationId, normalizedPhone);
    const optedOut = isSuppressed;

    const fullName = payload.lastName
      ? `${payload.firstName} ${payload.lastName}`.trim()
      : payload.firstName.trim();

    // Check duplicate
    const existing = await this.prisma.contact.findUnique({
      where: {
        organizationId_phoneNumber: {
          organizationId,
          phoneNumber: normalizedPhone,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Contact with phone ${normalizedPhone} already exists`);
    }

    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName,
        phoneNumber: normalizedPhone,
        email: payload.email || null,
        company: payload.company || null,
        designation: payload.designation || null,
        source: payload.source || 'MANUAL',
        marketingOptIn: payload.marketingOptIn ?? true,
        optInSource: payload.optInSource || 'DIRECT_ENTRY',
        optInAt: new Date(),
        optedOut,
        optedOutAt: optedOut ? new Date() : null,
        customFields: payload.customFields || {},
      },
    });

    if (payload.groupIds && payload.groupIds.length > 0) {
      await this.prisma.contactGroupMember.createMany({
        data: payload.groupIds.map((groupId) => ({
          groupId,
          contactId: contact.id,
        })),
        skipDuplicates: true,
      });
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CONTACT_CREATE,
      resourceType: 'Contact',
      resourceId: contact.id,
      metadata: { fullName, phoneNumber: normalizedPhone },
    });

    return this.getById(organizationId, contact.id);
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    payload: z.infer<typeof UpdateContactSchema>,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    let normalizedPhone = contact.phoneNumber;
    if (payload.phoneNumber) {
      normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
      if (!isValidPhoneNumber(normalizedPhone)) {
        throw new BadRequestException('Invalid phone number format');
      }
    }

    const firstName = payload.firstName !== undefined ? payload.firstName : contact.firstName;
    const lastName = payload.lastName !== undefined ? payload.lastName : contact.lastName;
    const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        fullName,
        phoneNumber: normalizedPhone,
        email: payload.email !== undefined ? payload.email : contact.email,
        company: payload.company !== undefined ? payload.company : contact.company,
        designation: payload.designation !== undefined ? payload.designation : contact.designation,
        marketingOptIn: payload.marketingOptIn !== undefined ? payload.marketingOptIn : contact.marketingOptIn,
        optedOut: payload.optedOut !== undefined ? payload.optedOut : contact.optedOut,
        customFields: payload.customFields !== undefined ? (payload.customFields as any) : (contact.customFields as any),
      },
    });

    if (payload.groupIds) {
      // Re-sync group memberships
      await this.prisma.contactGroupMember.deleteMany({ where: { contactId: id } });
      if (payload.groupIds.length > 0) {
        await this.prisma.contactGroupMember.createMany({
          data: payload.groupIds.map((groupId) => ({
            groupId,
            contactId: id,
          })),
        });
      }
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CONTACT_UPDATE,
      resourceType: 'Contact',
      resourceId: id,
      metadata: payload,
    });

    return this.getById(organizationId, id);
  }

  async delete(organizationId: string, userId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({ where: { id } });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CONTACT_DELETE,
      resourceType: 'Contact',
      resourceId: id,
      metadata: { fullName: contact.fullName, phoneNumber: contact.phoneNumber },
    });

    return { deleted: true, id };
  }

  async exportCsv(organizationId: string, query: ListContactsQuery): Promise<string> {
    const res = await this.list(organizationId, { ...query, limit: 10000 });
    const contacts = res.items;

    const headers = 'Full Name,Phone Number,Email,Company,Designation,Groups,Marketing Opt-In,Opted Out,Created At\n';
    const rows = contacts
      .map((c) => {
        const groups = c.groups ? c.groups.map((g: any) => g.name).join(';') : '';
        return `"${c.fullName}","${c.phoneNumber}","${c.email || ''}","${c.company || ''}","${c.designation || ''}","${groups}",${c.marketingOptIn},${c.optedOut},"${new Date(c.createdAt).toISOString()}"`;
      })
      .join('\n');

    return headers + rows;
  }

  async previewImport(fileBuffer: Buffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      throw new BadRequestException('Uploaded spreadsheet is empty.');
    }

    const headers = Object.keys(rawRows[0]);
    const suggestedMapping: Record<string, string> = {};

    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell') || lower.includes('whatsapp') || lower.includes('contact')) {
        suggestedMapping.phoneNumber = h;
      } else if (lower.includes('full') && lower.includes('name')) {
        suggestedMapping.fullName = h;
      } else if (lower.includes('first') || lower === 'name') {
        suggestedMapping.firstName = h;
      } else if (lower.includes('last') || lower.includes('surname')) {
        suggestedMapping.lastName = h;
      } else if (lower.includes('mail')) {
        suggestedMapping.email = h;
      } else if (lower.includes('comp') || lower.includes('org')) {
        suggestedMapping.company = h;
      } else if (lower.includes('desig') || lower.includes('title') || lower.includes('role')) {
        suggestedMapping.designation = h;
      }
    });

    const previewRows = rawRows.slice(0, 10).map((r) => {
      const cleanedPhone = this.cleanPhoneNumberString(r[suggestedMapping.phoneNumber || 'phoneNumber'] || r.phone || r.Mobile || '');
      return {
        ...r,
        phoneNumber: cleanedPhone,
      };
    });

    return {
      headers,
      suggestedMapping,
      previewRows,
      totalRows: rawRows.length,
    };
  }

  async processImport(
    organizationId: string,
    userId: string,
    fileBuffer: Buffer,
    options: {
      columnMapping: Record<string, string>;
      defaultGroupId?: string;
      marketingOptIn?: boolean;
      optInSource?: string;
    },
  ) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const mapping = options.columnMapping || {};
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rawPhone = row[mapping.phoneNumber] || row.phoneNumber || row.phone || row.Mobile || '';
      const normalizedPhone = this.cleanPhoneNumberString(rawPhone);

      if (!normalizedPhone || normalizedPhone.length < 8) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Invalid phone number "${rawPhone}"`);
        continue;
      }

      const firstName = String(row[mapping.firstName] || row.firstName || row.name || 'Friend').trim();
      const lastName = String(row[mapping.lastName] || row.lastName || '').trim();
      const fullName = String(row[mapping.fullName] || (lastName ? `${firstName} ${lastName}` : firstName)).trim();
      const email = String(row[mapping.email] || row.email || '').trim() || null;
      const company = String(row[mapping.company] || row.company || '').trim() || null;
      const designation = String(row[mapping.designation] || row.designation || '').trim() || null;

      try {
        const contact = await this.prisma.contact.upsert({
          where: {
            organizationId_phoneNumber: {
              organizationId,
              phoneNumber: normalizedPhone,
            },
          },
          update: {
            firstName,
            lastName,
            fullName,
            email,
            company,
            designation,
          },
          create: {
            organizationId,
            firstName,
            lastName,
            fullName,
            phoneNumber: normalizedPhone,
            email,
            company,
            designation,
            source: 'EXCEL_IMPORT',
            marketingOptIn: options.marketingOptIn ?? true,
            optInSource: options.optInSource || 'EXCEL_IMPORT',
            optInAt: new Date(),
          },
        });

        if (options.defaultGroupId) {
          await this.prisma.contactGroupMember.upsert({
            where: {
              groupId_contactId: {
                groupId: options.defaultGroupId,
                contactId: contact.id,
              },
            },
            update: {},
            create: {
              contactId: contact.id,
              groupId: options.defaultGroupId,
            },
          });
        }

        importedCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push(`Row ${i + 1} (${fullName}): ${err.message}`);
      }
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CONTACT_IMPORT,
      resourceType: 'Contact',
      resourceId: organizationId,
      metadata: { importedCount, skippedCount, totalRows: rawRows.length },
    });

    return {
      totalRows: rawRows.length,
      importedCount,
      skippedCount,
      errors: errors.slice(0, 10),
    };
  }

  private cleanPhoneNumberString(raw: any): string {
    let s = String(raw || '').trim();
    if (s.toLowerCase().includes('e+') || s.toLowerCase().includes('e-')) {
      try {
        s = Number(s).toLocaleString('fullwide', { useGrouping: false });
      } catch {}
    }
    const clean = s.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.length === 10) return `+91${clean}`;
    if (clean.length === 12 && clean.startsWith('91')) return `+${clean}`;
    return clean ? `+${clean}` : '';
  }
}
