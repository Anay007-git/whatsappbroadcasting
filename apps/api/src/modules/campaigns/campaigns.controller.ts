import { Controller, Get, Post, Patch, Body, Param, Query, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateCampaignSchema, UpdateCampaignSchema } from '@eventblast/validation';
import { CampaignStatus } from '@prisma/client';
import { z } from 'zod';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List campaigns with delivery and RSVP progress' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('eventId') eventId?: string,
    @Query('status') status?: CampaignStatus,
  ) {
    return this.campaignsService.list(user.organizationId, eventId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details by ID' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateCampaignSchema))
  @ApiOperation({ summary: 'Create a new campaign draft' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateCampaignSchema>,
  ) {
    return this.campaignsService.create(user.organizationId, user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(UpdateCampaignSchema))
  @ApiOperation({ summary: 'Update a campaign' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: z.infer<typeof UpdateCampaignSchema>,
  ) {
    return this.campaignsService.update(user.organizationId, user.userId, id, body);
  }

  @Get(':id/audience')
  @ApiOperation({ summary: 'Calculate estimated eligible recipients and opt-out counts' })
  async calculateAudience(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.calculateAudience(user.organizationId, id);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate campaign readiness before launching' })
  async validateCampaign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.validateCampaign(user.organizationId, id);
  }

  @Post(':id/launch')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Launch campaign execution' })
  async launch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.launch(user.organizationId, user.userId, id);
  }

  @Post(':id/pause')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Pause a running campaign' })
  async pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.pause(user.organizationId, user.userId, id);
  }

  @Post(':id/resume')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Resume a paused campaign' })
  async resume(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.resume(user.organizationId, user.userId, id);
  }

  @Post(':id/emergency-stop')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Immediately stop and cancel all pending campaign messages' })
  async emergencyStop(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.emergencyStop(user.organizationId, user.userId, id);
  }
}
