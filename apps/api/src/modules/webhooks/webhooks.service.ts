import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignMessageStatus, InvitationStatus, WhatsAppSessionStatus } from '@prisma/client';
import { OpenWAWebhookPayload } from '@eventblast/types';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async handleOpenWAWebhook(payload: OpenWAWebhookPayload) {
    this.logger.log(`Received OpenWA webhook: ${payload.event} for session ${payload.sessionId}`);

    if (!payload || !payload.event) {
      return { received: false, error: 'Invalid webhook payload' };
    }

    switch (payload.event) {
      case 'session.connected':
        await this.handleSessionConnected(payload);
        break;

      case 'session.disconnected':
        await this.handleSessionDisconnected(payload);
        break;

      case 'message.sent':
      case 'message.delivered':
      case 'message.read':
      case 'message.failed':
        await this.handleMessageEvent(payload);
        break;

      default:
        this.logger.debug(`Unhandled webhook event: ${payload.event}`);
    }

    return { received: true, event: payload.event };
  }

  private async handleSessionConnected(payload: OpenWAWebhookPayload) {
    await this.prisma.whatsAppSession.updateMany({
      where: { providerSessionId: payload.sessionId },
      data: {
        status: WhatsAppSessionStatus.CONNECTED,
        phoneNumber: payload.data?.phoneNumber,
        lastSeenAt: new Date(),
        qrCode: null,
      },
    });
  }

  private async handleSessionDisconnected(payload: OpenWAWebhookPayload) {
    await this.prisma.whatsAppSession.updateMany({
      where: { providerSessionId: payload.sessionId },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        lastSeenAt: new Date(),
      },
    });
  }

  private async handleMessageEvent(payload: OpenWAWebhookPayload) {
    const messageId = payload.data?.messageId;
    if (!messageId) return;

    const message = await this.prisma.campaignMessage.findFirst({
      where: { providerMessageId: messageId },
      include: { campaign: true },
    });

    if (!message) {
      this.logger.debug(`No matching CampaignMessage found for providerMessageId: ${messageId}`);
      return;
    }

    const now = new Date();

    if (payload.event === 'message.delivered' && message.status !== CampaignMessageStatus.DELIVERED && message.status !== CampaignMessageStatus.READ) {
      await this.prisma.$transaction([
        this.prisma.campaignMessage.update({
          where: { id: message.id },
          data: {
            status: CampaignMessageStatus.DELIVERED,
            deliveredAt: now,
          },
        }),
        this.prisma.campaign.update({
          where: { id: message.campaignId },
          data: { deliveredCount: { increment: 1 } },
        }),
      ]);

      if (message.eventGuestId) {
        await this.prisma.eventGuest.update({
          where: { id: message.eventGuestId },
          data: { invitationStatus: InvitationStatus.DELIVERED },
        });
      }
    } else if (payload.event === 'message.read' && message.status !== CampaignMessageStatus.READ) {
      await this.prisma.$transaction([
        this.prisma.campaignMessage.update({
          where: { id: message.id },
          data: {
            status: CampaignMessageStatus.READ,
            readAt: now,
          },
        }),
        this.prisma.campaign.update({
          where: { id: message.campaignId },
          data: { readCount: { increment: 1 } },
        }),
      ]);

      if (message.eventGuestId) {
        await this.prisma.eventGuest.update({
          where: { id: message.eventGuestId },
          data: { invitationStatus: InvitationStatus.READ },
        });
      }
    } else if (payload.event === 'message.failed' && message.status !== CampaignMessageStatus.FAILED) {
      await this.prisma.$transaction([
        this.prisma.campaignMessage.update({
          where: { id: message.id },
          data: {
            status: CampaignMessageStatus.FAILED,
            failedAt: now,
            failureReason: payload.data?.reason || 'Provider reported send failure',
          },
        }),
        this.prisma.campaign.update({
          where: { id: message.campaignId },
          data: { failedCount: { increment: 1 } },
        }),
      ]);

      if (message.eventGuestId) {
        await this.prisma.eventGuest.update({
          where: { id: message.eventGuestId },
          data: { invitationStatus: InvitationStatus.FAILED },
        });
      }
    }
  }
}
