import { Controller, Get, Post, Patch, Delete, Body, Param, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactGroupsService } from './contact-groups.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateGroupSchema, UpdateGroupSchema } from '@eventblast/validation';
import { z } from 'zod';

@ApiTags('Contact Groups')
@ApiBearerAuth()
@Controller('groups')
export class ContactGroupsController {
  constructor(private groupsService: ContactGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all contact groups' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.list(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact group by ID' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groupsService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateGroupSchema))
  @ApiOperation({ summary: 'Create a new contact group' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateGroupSchema>,
  ) {
    return this.groupsService.create(user.organizationId, user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(UpdateGroupSchema))
  @ApiOperation({ summary: 'Update a contact group' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: z.infer<typeof UpdateGroupSchema>,
  ) {
    return this.groupsService.update(user.organizationId, user.userId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete a contact group' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groupsService.delete(user.organizationId, user.userId, id);
  }
}
