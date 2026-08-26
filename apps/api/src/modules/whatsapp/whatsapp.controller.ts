import { Controller, Get, Post, Body, Param, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@eventblast/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateSessionSchema, TestMessageSchema } from '@eventblast/validation';
import { WhatsAppProviderType, MediaType } from '@prisma/client';
import { z } from 'zod';

@ApiTags('WhatsApp Sessions')
@ApiBearerAuth()
@Controller('whatsapp/sessions')
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) {}

  @Get()
  @ApiOperation({ summary: 'List all WhatsApp sessions for the organization' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.listSessions(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details by ID' })
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.whatsappService.getSessionById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(CreateSessionSchema))
  @ApiOperation({ summary: 'Create a new WhatsApp session' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof CreateSessionSchema>,
  ) {
    return this.whatsappService.createSession(
      user.organizationId,
      user.userId,
      body.displayName,
      body.provider as WhatsAppProviderType,
    );
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Start a WhatsApp session / initialize connection' })
  async start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.whatsappService.startSession(user.organizationId, user.userId, id);
  }

  @Post(':id/stop')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Stop / disconnect a WhatsApp session' })
  async stop(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.whatsappService.stopSession(user.organizationId, user.userId, id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Retrieve QR code data URL for scanning' })
  async getQRCode(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.whatsappService.getQRCode(user.organizationId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync session status with gateway provider' })
  async sync(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.whatsappService.syncStatus(user.organizationId, id);
  }

  @Post('test-send')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @UsePipes(new ZodValidationPipe(TestMessageSchema))
  @ApiOperation({ summary: 'Send a test WhatsApp message to verify formatting and session connectivity' })
  async testSend(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: z.infer<typeof TestMessageSchema>,
  ) {
    return this.whatsappService.sendTestMessage(
      user.organizationId,
      body.whatsappSessionId,
      body.phoneNumber,
      body.messageContent,
      body.mediaUrl,
      body.mediaType as MediaType,
    );
  }
}
