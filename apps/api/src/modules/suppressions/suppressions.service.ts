import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { normalizePhoneNumber } from '@eventblast/shared';

@Injectable()
export class SuppressionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async list(organizationId: string, page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.suppressionEntry.count({ where }),
      this.prisma.suppressionEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addSuppression(
    organizationId: string,
    userId: string,
    phoneNumber: string,
    reason: string,
    source = 'MANUAL',
  ) {
    const normalized = normalizePhoneNumber(phoneNumber);

    const existing = await this.prisma.suppressionEntry.findUnique({
      where: {
        organizationId_phoneNumber: {
          organizationId,
          phoneNumber: normalized,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const entry = await this.prisma.suppressionEntry.create({
      data: {
        organizationId,
        phoneNumber: normalized,
        reason,
        source,
      },
    });

    // Also mark contact as opted-out if exists
    await this.prisma.contact.updateMany({
      where: { organizationId, phoneNumber: normalized },
      data: { optedOut: true, optedOutAt: new Date() },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.SUPPRESSION_ADD,
      resourceType: 'SuppressionEntry',
      resourceId: entry.id,
      metadata: { phoneNumber: normalized, reason, source },
    });

    return entry;
  }

  async removeSuppression(organizationId: string, userId: string, id: string) {
    const entry = await this.prisma.suppressionEntry.findFirst({
      where: { id, organizationId },
    });

    if (entry) {
      await this.prisma.suppressionEntry.delete({ where: { id } });

      await this.auditService.log({
        organizationId,
        userId,
        action: AuditAction.SUPPRESSION_REMOVE,
        resourceType: 'SuppressionEntry',
        resourceId: id,
        metadata: { phoneNumber: entry.phoneNumber },
      });
    }

    return { removed: true, id };
  }

  async isSuppressed(organizationId: string, phoneNumber: string): Promise<boolean> {
    const normalized = normalizePhoneNumber(phoneNumber);
    const count = await this.prisma.suppressionEntry.count({
      where: { organizationId, phoneNumber: normalized },
    });
    return count > 0;
  }

  async exportCsv(organizationId: string): Promise<string> {
    const entries = await this.prisma.suppressionEntry.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = 'Phone Number,Reason,Source,Created At\n';
    const rows = entries
      .map(
        (e) =>
          `"${e.phoneNumber}","${e.reason.replace(/"/g, '""')}","${e.source}","${e.createdAt.toISOString()}"`,
      )
      .join('\n');

    return headers + rows;
  }
}
