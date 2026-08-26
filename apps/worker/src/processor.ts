import { PrismaClient, CampaignStatus, CampaignMessageStatus, InvitationStatus, WhatsAppSessionStatus } from '@prisma/client';
import { WhatsAppProviderFactory } from '@eventblast/whatsapp';
import { WhatsAppProviderType } from '@eventblast/types';

export interface ProcessCampaignJobData {
  campaignId: string;
  organizationId: string;
}

export class CampaignProcessor {
  private prisma: PrismaClient;
  private minDelayMs: number;

  constructor(prisma: PrismaClient, minDelayMs = 1000) {
    this.prisma = prisma;
    this.minDelayMs = minDelayMs;
  }

  async processCampaign(campaignId: string) {
    console.log(`[Worker] Starting processing for campaign: ${campaignId}`);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { whatsappSession: true, event: true },
    });

    if (!campaign) {
      console.error(`[Worker] Campaign ${campaignId} not found`);
      return;
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      console.log(`[Worker] Campaign ${campaignId} is not in RUNNING state (${campaign.status}). Skipping.`);
      return;
    }

    const session = campaign.whatsappSession;
    if (!session || session.status !== WhatsAppSessionStatus.CONNECTED) {
      console.error(`[Worker] Session ${session?.displayName} is not connected. Marking campaign paused.`);
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.PAUSED },
      });
      return;
    }

    const provider = WhatsAppProviderFactory.getProvider(
      session.provider as unknown as WhatsAppProviderType,
      {
        openwaConfig: {
          baseUrl: process.env.OPENWA_BASE_URL || 'http://localhost:2785',
          apiKey: process.env.OPENWA_API_KEY,
          webhookSecret: process.env.OPENWA_WEBHOOK_SECRET,
        },
      },
    );

    const queuedMessages = await this.prisma.campaignMessage.findMany({
      where: { campaignId, status: CampaignMessageStatus.QUEUED },
      include: { contact: true },
    });

    console.log(`[Worker] Found ${queuedMessages.length} queued messages to dispatch.`);

    // Load current suppression list
    const suppressed = await this.prisma.suppressionEntry.findMany({
      where: { organizationId: campaign.organizationId },
      select: { phoneNumber: true },
    });
    const suppressedSet = new Set(suppressed.map((s) => s.phoneNumber));

    for (const msg of queuedMessages) {
      // 1. Re-check campaign status before each message to handle emergency stop
      const current = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (!current || current.status !== CampaignStatus.RUNNING) {
        console.log(`[Worker] Campaign status changed to ${current?.status}. Aborting worker dispatch loop.`);
        break;
      }

      // 2. Check suppression
      if (suppressedSet.has(msg.contact.phoneNumber) || msg.contact.optedOut) {
        await this.prisma.$transaction([
          this.prisma.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: CampaignMessageStatus.FAILED,
              failedAt: new Date(),
              failureReason: 'Recipient is in suppression list / opted out',
            },
          }),
          this.prisma.campaign.update({
            where: { id: campaignId },
            data: { failedCount: { increment: 1 } },
          }),
        ]);
        continue;
      }

      // 3. Mark sending
      await this.prisma.campaignMessage.update({
        where: { id: msg.id },
        data: { status: CampaignMessageStatus.SENDING, attemptCount: { increment: 1 } },
      });

      try {
        let sendResult;
        if (msg.mediaUrl && msg.mediaType) {
          sendResult = await provider.sendMedia({
            sessionId: session.providerSessionId,
            to: msg.contact.phoneNumber,
            mediaUrl: msg.mediaUrl,
            mediaType: msg.mediaType as any,
            caption: msg.renderedMessage,
          });
        } else {
          sendResult = await provider.sendText({
            sessionId: session.providerSessionId,
            to: msg.contact.phoneNumber,
            text: msg.renderedMessage,
          });
        }

        if (sendResult.success) {
          const now = new Date();
          await this.prisma.$transaction([
            this.prisma.campaignMessage.update({
              where: { id: msg.id },
              data: {
                status: CampaignMessageStatus.SENT,
                providerMessageId: sendResult.providerMessageId,
                sentAt: now,
              },
            }),
            this.prisma.campaign.update({
              where: { id: campaignId },
              data: { sentCount: { increment: 1 } },
            }),
          ]);

          if (msg.eventGuestId) {
            await this.prisma.eventGuest.update({
              where: { id: msg.eventGuestId },
              data: { invitationStatus: InvitationStatus.SENT, invitedAt: now },
            });
          }
        } else {
          await this.prisma.$transaction([
            this.prisma.campaignMessage.update({
              where: { id: msg.id },
              data: {
                status: CampaignMessageStatus.FAILED,
                failedAt: new Date(),
                failureReason: sendResult.error || 'Provider rejected message',
              },
            }),
            this.prisma.campaign.update({
              where: { id: campaignId },
              data: { failedCount: { increment: 1 } },
            }),
          ]);
        }
      } catch (error: any) {
        console.error(`[Worker] Error sending message ${msg.id}:`, error.message);
        await this.prisma.campaignMessage.update({
          where: { id: msg.id },
          data: {
            status: CampaignMessageStatus.FAILED,
            failedAt: new Date(),
            failureReason: error.message,
          },
        });
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      // Operational delay
      await new Promise((resolve) => setTimeout(resolve, this.minDelayMs));
    }

    // Check completion
    const remaining = await this.prisma.campaignMessage.count({
      where: { campaignId, status: { in: [CampaignMessageStatus.QUEUED, CampaignMessageStatus.SENDING] } },
    });

    if (remaining === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
      });
      console.log(`[Worker] Campaign ${campaignId} completed all messages!`);
    }
  }

  /**
   * Scans for automated reminders (e.g. 24 hours before event start)
   */
  async processAutomatedReminders() {
    const rules = await this.prisma.automationRule.findMany({
      where: { isActive: true },
      include: { event: true, template: true },
    });

    const now = new Date();

    for (const rule of rules) {
      const event = rule.event;
      if (!event || event.status !== 'PUBLISHED') continue;

      const eventStart = new Date(event.startAt);
      const hoursUntilStart = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If within target window (+/- 1 hour buffer)
      if (hoursUntilStart > 0 && Math.abs(hoursUntilStart - rule.triggerOffsetHours) <= 1) {
        // Find confirmed guests who haven't received reminder
        const confirmedGuests = await this.prisma.eventGuest.findMany({
          where: { eventId: event.id, rsvpStatus: 'GOING' },
          include: { contact: true },
        });

        for (const guest of confirmedGuests) {
          const alreadyExecuted = await this.prisma.automationExecution.findFirst({
            where: { ruleId: rule.id, eventId: event.id, contactId: guest.contactId },
          });

          if (!alreadyExecuted) {
            console.log(`[Worker] Triggering reminder for guest ${guest.contact.fullName} for event ${event.name}`);
            await this.prisma.automationExecution.create({
              data: {
                ruleId: rule.id,
                eventId: event.id,
                contactId: guest.contactId,
                status: 'TRIGGERED',
              },
            });
          }
        }
      }
    }
  }
}
