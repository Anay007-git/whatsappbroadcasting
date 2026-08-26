import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, Role, UserStatus } from '@prisma/client';
import { LoginSchema, RegisterSchema } from '@eventblast/validation';
import { z } from 'zod';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async login(payload: z.infer<typeof LoginSchema>, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account has been deactivated. Please contact your administrator.',
        },
      });
    }

    const tokenPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(tokenPayload);

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: AuditAction.LOGIN,
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          timezone: user.organization.timezone,
          logoUrl: user.organization.logoUrl,
        },
      },
    };
  }

  async register(payload: z.infer<typeof RegisterSchema>, ip?: string, userAgent?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    const slug = payload.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `org-${Date.now()}`;

    const passwordHash = await bcrypt.hash(payload.password, 10);

    // Transaction to create organization and owner user atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: payload.organizationName,
          slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
          timezone: payload.timezone || 'Asia/Kolkata',
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          name: payload.name,
          email: payload.email.toLowerCase(),
          passwordHash,
          role: Role.OWNER,
          status: UserStatus.ACTIVE,
        },
      });

      return { org, user };
    });

    await this.auditService.log({
      organizationId: result.org.id,
      userId: result.user.id,
      action: AuditAction.LOGIN,
      resourceType: 'Organization',
      resourceId: result.org.id,
      ipAddress: ip,
      userAgent,
      metadata: { action: 'ACCOUNT_REGISTRATION' },
    });

    const tokenPayload = {
      sub: result.user.id,
      organizationId: result.org.id,
      email: result.user.email,
      role: result.user.role,
    };

    const accessToken = this.jwtService.sign(tokenPayload);

    return {
      accessToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
          timezone: result.org.timezone,
          logoUrl: result.org.logoUrl,
        },
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        timezone: user.organization.timezone,
        logoUrl: user.organization.logoUrl,
      },
    };
  }
}
