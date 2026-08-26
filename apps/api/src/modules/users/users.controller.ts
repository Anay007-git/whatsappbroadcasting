import { Controller, Get, Post, Patch, Delete, Body, Param, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InviteUserSchema } from '@eventblast/validation';
import { Role } from '@prisma/client';
import { z } from 'zod';

@ApiTags('Users & Team')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all team members in the organization' })
  async listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listUsers(user.organizationId);
  }

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(InviteUserSchema))
  @ApiOperation({ summary: 'Invite a new team member' })
  async inviteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof InviteUserSchema>,
  ) {
    return this.usersService.inviteUser(user.organizationId, user.userId, body);
  }

  @Patch(':id/role')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update a team member role' })
  async updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetUserId: string,
    @Body('role') role: Role,
  ) {
    return this.usersService.updateUserRole(user.organizationId, user.userId, targetUserId, role);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Remove a team member' })
  async deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.deleteUser(user.organizationId, user.userId, targetUserId);
  }
}
