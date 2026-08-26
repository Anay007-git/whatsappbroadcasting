import { Controller, Get, Post, Delete, Body, Param, Query, Res, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppressionsService } from './suppressions.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateSuppressionSchema } from '@eventblast/validation';
import { Response } from 'express';
import { z } from 'zod';

@ApiTags('Suppressions & Compliance')
@ApiBearerAuth()
@Controller('suppressions')
export class SuppressionsController {
  constructor(private suppressionsService: SuppressionsService) {}

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List suppressed phone numbers' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.suppressionsService.list(
      user.organizationId,
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
      search,
    );
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateSuppressionSchema))
  @ApiOperation({ summary: 'Add a phone number to the suppression list' })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateSuppressionSchema>,
  ) {
    return this.suppressionsService.addSuppression(
      user.organizationId,
      user.userId,
      body.phoneNumber,
      body.reason,
      body.source,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove a phone number from the suppression list' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.suppressionsService.removeSuppression(user.organizationId, user.userId, id);
  }

  @Get('export/csv')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Export suppression list as CSV' })
  async exportCsv(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const csvData = await this.suppressionsService.exportCsv(user.organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="suppression_list.csv"');
    return res.send(csvData);
  }
}
