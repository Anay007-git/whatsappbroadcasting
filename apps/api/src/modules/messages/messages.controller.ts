import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { CampaignMessageStatus } from '@prisma/client';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'List campaign messages with status filter and pagination' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: CampaignMessageStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.list(
      user.organizationId,
      campaignId,
      status,
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
    );
  }

  @Post(':id/retry')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Retry sending a failed message' })
  async retry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messagesService.retryMessage(user.organizationId, id);
  }
}
