import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Public } from '../../common/decorators/public.decorator';
import { OpenWAWebhookPayload } from '@eventblast/types';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private webhooksService: WebhooksService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('openwa')
  @ApiOperation({ summary: 'Incoming webhook endpoint for OpenWA gateway events' })
  async handleOpenWA(
    @Body() payload: OpenWAWebhookPayload,
    @Headers('x-webhook-secret') secretHeader?: string,
  ) {
    const configuredSecret = this.configService.get<string>('OPENWA_WEBHOOK_SECRET');

    // If secret configured, verify header
    if (configuredSecret && secretHeader && secretHeader !== configuredSecret) {
      throw new UnauthorizedException('Invalid webhook signature/secret');
    }

    return this.webhooksService.handleOpenWAWebhook(payload);
  }
}
