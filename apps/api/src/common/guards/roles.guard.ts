import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@eventblast/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to perform this action',
        },
      });
    }

    // Role hierarchy mapping: OWNER > ADMIN > MANAGER > OPERATOR > VIEWER
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.OWNER]: 5,
      [UserRole.ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.OPERATOR]: 2,
      [UserRole.VIEWER]: 1,
    };

    const userRoleValue = roleHierarchy[user.role as UserRole] || 0;
    const minRequiredRoleValue = Math.min(
      ...requiredRoles.map((r) => roleHierarchy[r] || 99),
    );

    const hasPermission = userRoleValue >= minRequiredRoleValue;
    if (!hasPermission) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Role ${user.role} does not have required permissions: ${requiredRoles.join(', ')}`,
        },
      });
    }

    return true;
  }
}
