import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { UpdateOrganizationSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getOrganization(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            contacts: true,
            events: true,
            campaigns: true,
            users: true,
            whatsappSessions: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(
    orgId: string,
    userId: string,
    payload: z.infer<typeof UpdateOrganizationSchema>,
  ) {
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: payload,
    });

    await this.auditService.log({
      organizationId: orgId,
      userId,
      action: AuditAction.SETTINGS_CHANGE,
      resourceType: 'Organization',
      resourceId: orgId,
      metadata: payload,
    });

    return updated;
  }
}
