import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateContactSchema, UpdateContactSchema } from '@eventblast/validation';
import { Response } from 'express';
import { z } from 'zod';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List contacts with multi-criteria filtering' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('groupId') groupId?: string,
    @Query('marketingOptIn') marketingOptIn?: string,
    @Query('optedOut') optedOut?: string,
    @Query('company') company?: string,
  ) {
    return this.contactsService.list(user.organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
      groupId,
      marketingOptIn: marketingOptIn !== undefined ? marketingOptIn === 'true' : undefined,
      optedOut: optedOut !== undefined ? optedOut === 'true' : undefined,
      company,
    });
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export filtered contacts to CSV' })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('groupId') groupId?: string,
  ) {
    const csv = await this.contactsService.exportCsv(user.organizationId, { search, groupId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts_export.csv"');
    return res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact profile by ID with event and campaign history' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateContactSchema))
  @ApiOperation({ summary: 'Create a new contact' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateContactSchema>,
  ) {
    return this.contactsService.create(user.organizationId, user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(UpdateContactSchema))
  @ApiOperation({ summary: 'Update an existing contact' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: z.infer<typeof UpdateContactSchema>,
  ) {
    return this.contactsService.update(user.organizationId, user.userId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete a contact' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.delete(user.organizationId, user.userId, id);
  }
}
