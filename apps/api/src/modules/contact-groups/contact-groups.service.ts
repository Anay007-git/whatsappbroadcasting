import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { CreateGroupSchema, UpdateGroupSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class ContactGroupsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async list(organizationId: string) {
    const groups = await this.prisma.contactGroup.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      contactCount: g._count.members,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  async getById(organizationId: string, id: string) {
    const group = await this.prisma.contactGroup.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      contactCount: group._count.members,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  async create(organizationId: string, userId: string, payload: z.infer<typeof CreateGroupSchema>) {
    const existing = await this.prisma.contactGroup.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: payload.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Group with this name already exists');
    }

    const group = await this.prisma.contactGroup.create({
      data: {
        organizationId,
        name: payload.name,
        description: payload.description,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.GROUP_CREATE,
      resourceType: 'ContactGroup',
      resourceId: group.id,
      metadata: { name: group.name },
    });

    return group;
  }

  async update(organizationId: string, userId: string, id: string, payload: z.infer<typeof UpdateGroupSchema>) {
    const group = await this.prisma.contactGroup.findFirst({
      where: { id, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const updated = await this.prisma.contactGroup.update({
      where: { id },
      data: payload,
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.GROUP_UPDATE,
      resourceType: 'ContactGroup',
      resourceId: id,
      metadata: payload,
    });

    return updated;
  }

  async delete(organizationId: string, userId: string, id: string) {
    const group = await this.prisma.contactGroup.findFirst({
      where: { id, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.contactGroup.delete({ where: { id } });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.GROUP_DELETE,
      resourceType: 'ContactGroup',
      resourceId: id,
      metadata: { deletedName: group.name },
    });

    return { deleted: true, id };
  }
}
