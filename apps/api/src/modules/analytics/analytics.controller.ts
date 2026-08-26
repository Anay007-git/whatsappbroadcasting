import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get overview dashboard metrics and performance funnels' })
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getDashboardSummary(user.organizationId);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get detailed delivery and conversion analytics for a campaign' })
  async getCampaignAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') campaignId: string,
  ) {
    return this.analyticsService.getCampaignAnalytics(user.organizationId, campaignId);
  }
}
