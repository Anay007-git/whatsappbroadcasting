import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, MediaType } from '@prisma/client';
import { extractTemplateVariables } from '@eventblast/shared';
import { CreateTemplateSchema, UpdateTemplateSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async list(organizationId: string, category?: string) {
    const where: any = { organizationId, isArchived: false };
    if (category) where.category = category;

    return this.prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async create(organizationId: string, userId: string, payload: z.infer<typeof CreateTemplateSchema>) {
    const extractedVariables = extractTemplateVariables(payload.content);

    const template = await this.prisma.template.create({
      data: {
        organizationId,
        name: payload.name,
        content: payload.content,
        category: payload.category || 'MARKETING',
        mediaUrl: payload.mediaUrl || null,
        mediaType: payload.mediaType as MediaType || null,
        variables: extractedVariables,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_CREATE,
      resourceType: 'Template',
      resourceId: template.id,
      metadata: { name: template.name, variables: extractedVariables },
    });

    return template;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    payload: z.infer<typeof UpdateTemplateSchema>,
  ) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const content = payload.content !== undefined ? payload.content : template.content;
    const extractedVariables = extractTemplateVariables(content);

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        name: payload.name !== undefined ? payload.name : template.name,
        content,
        category: payload.category !== undefined ? payload.category : template.category,
        mediaUrl: payload.mediaUrl !== undefined ? payload.mediaUrl : template.mediaUrl,
        mediaType: payload.mediaType !== undefined ? (payload.mediaType as MediaType) : template.mediaType,
        variables: extractedVariables,
      },
    });

    return updated;
  }

  async delete(organizationId: string, userId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.template.update({
      where: { id },
      data: { isArchived: true },
    });

    return { deleted: true, id };
  }
}
