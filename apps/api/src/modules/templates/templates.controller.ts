import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateTemplateSchema, UpdateTemplateSchema } from '@eventblast/validation';
import { z } from 'zod';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all message templates' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query('category') category?: string) {
    return this.templatesService.list(user.organizationId, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.templatesService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateTemplateSchema))
  @ApiOperation({ summary: 'Create a new message template' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateTemplateSchema>,
  ) {
    return this.templatesService.create(user.organizationId, user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(UpdateTemplateSchema))
  @ApiOperation({ summary: 'Update a message template' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: z.infer<typeof UpdateTemplateSchema>,
  ) {
    return this.templatesService.update(user.organizationId, user.userId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Archive a template' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.templatesService.delete(user.organizationId, user.userId, id);
  }
}
