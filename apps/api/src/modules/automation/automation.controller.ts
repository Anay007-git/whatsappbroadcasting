import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';

@ApiTags('Automation')
@ApiBearerAuth()
@Controller('automation')
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  @Get('rules')
  @ApiOperation({ summary: 'List automated reminder rules' })
  async listRules(@CurrentUser() user: AuthenticatedUser, @Query('eventId') eventId?: string) {
    return this.automationService.listRules(user.organizationId, eventId);
  }

  @Post('rules')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create automated event reminder rule' })
  async createRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body('eventId') eventId: string,
    @Body('triggerOffsetHours') triggerOffsetHours: number,
    @Body('templateId') templateId: string,
    @Body('conditionFilter') conditionFilter?: any,
  ) {
    return this.automationService.createRule(
      user.organizationId,
      eventId,
      triggerOffsetHours,
      templateId,
      conditionFilter,
    );
  }

  @Post('rules/:id/toggle')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Toggle automated rule active status' })
  async toggleRule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.automationService.toggleRule(user.organizationId, id);
  }

  @Delete('rules/:id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete an automated rule' })
  async deleteRule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.automationService.deleteRule(user.organizationId, id);
  }
}
