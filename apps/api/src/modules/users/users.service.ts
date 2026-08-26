import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { InviteUserSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteUser(
    organizationId: string,
    currentUserId: string,
    payload: z.infer<typeof InviteUserSchema>,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const defaultPassword = 'TempPassword123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role as Role,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: currentUserId,
      action: AuditAction.USER_INVITE,
      resourceType: 'User',
      resourceId: user.id,
      metadata: { invitedEmail: payload.email, role: payload.role },
    });

    return user;
  }

  async updateUserRole(
    organizationId: string,
    currentUserId: string,
    targetUserId: string,
    role: Role,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found in organization');
    }

    if (user.id === currentUserId && role !== Role.OWNER) {
      throw new ForbiddenException('You cannot demote your own account');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: currentUserId,
      action: AuditAction.USER_UPDATE,
      resourceType: 'User',
      resourceId: targetUserId,
      metadata: { newRole: role },
    });

    return updated;
  }

  async deleteUser(organizationId: string, currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    await this.auditService.log({
      organizationId,
      userId: currentUserId,
      action: AuditAction.USER_UPDATE,
      resourceType: 'User',
      resourceId: targetUserId,
      metadata: { action: 'USER_DELETED', deletedEmail: user.email },
    });

    return { deleted: true, userId: targetUserId };
  }
}
