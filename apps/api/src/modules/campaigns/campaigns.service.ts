import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SuppressionsService } from '../suppressions/suppressions.service';
import {
  CampaignStatus,
  CampaignType,
  CampaignMessageStatus,
  InvitationStatus,
  RSVPStatus,
  AuditAction,
  MediaType,
  WhatsAppSessionStatus,
} from '@prisma/client';
import {
  renderTemplateVariables,
  extractTemplateVariables,
  generateSecureToken,
} from '@eventblast/shared';
import { CreateCampaignSchema, UpdateCampaignSchema } from '@eventblast/validation';
import { z } from 'zod';
import { format } from 'date-fns';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
    private whatsappService: WhatsAppService,
    private suppressionsService: SuppressionsService,
  ) {}

  async list(organizationId: string, eventId?: string, status?: CampaignStatus) {
    const where: any = { organizationId };
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: { id: true, name: true, startAt: true, bannerUrl: true },
        },
        whatsappSession: {
          select: { id: true, displayName: true, phoneNumber: true, status: true },
        },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        event: true,
        whatsappSession: true,
        template: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async create(organizationId: string, userId: string, payload: z.infer<typeof CreateCampaignSchema>) {
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        eventId: payload.eventId || null,
        name: payload.name,
        description: payload.description || null,
        campaignType: payload.campaignType as CampaignType,
        status: CampaignStatus.DRAFT,
        whatsappSessionId: payload.whatsappSessionId,
        templateId: payload.templateId || null,
        messageContent: payload.messageContent,
        mediaUrl: payload.mediaUrl || null,
        mediaType: payload.mediaType as MediaType || null,
        targetAudience: payload.targetAudience as any,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        createdBy: userId,
      },
      include: {
        event: true,
        whatsappSession: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_CREATE,
      resourceType: 'Campaign',
      resourceId: campaign.id,
      metadata: { name: campaign.name, type: campaign.campaignType },
    });

    return campaign;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    payload: z.infer<typeof UpdateCampaignSchema>,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot modify a running campaign. Pause it first.');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        eventId: payload.eventId !== undefined ? payload.eventId : campaign.eventId,
        name: payload.name !== undefined ? payload.name : campaign.name,
        description: payload.description !== undefined ? payload.description : campaign.description,
        campaignType: payload.campaignType ? (payload.campaignType as CampaignType) : campaign.campaignType,
        whatsappSessionId: payload.whatsappSessionId || campaign.whatsappSessionId,
        templateId: payload.templateId !== undefined ? payload.templateId : campaign.templateId,
        messageContent: payload.messageContent !== undefined ? payload.messageContent : campaign.messageContent,
        mediaUrl: payload.mediaUrl !== undefined ? payload.mediaUrl : campaign.mediaUrl,
        mediaType: payload.mediaType !== undefined ? (payload.mediaType as MediaType) : campaign.mediaType,
        targetAudience: payload.targetAudience !== undefined ? (payload.targetAudience as any) : campaign.targetAudience,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : campaign.scheduledAt,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_UPDATE,
      resourceType: 'Campaign',
      resourceId: id,
      metadata: payload,
    });

    return updated;
  }

  /**
   * Calculates eligible target audience based on filters and suppression lists
   */
  async calculateAudience(organizationId: string, campaignId: string) {
    const campaign = await this.getById(organizationId, campaignId);
    const audienceConfig = (campaign.targetAudience || {}) as any;

    let contactQuery: any = { organizationId };

    if (audienceConfig.type === 'GROUP' && audienceConfig.groupIds?.length > 0) {
      contactQuery.groupMembers = {
        some: { groupId: { in: audienceConfig.groupIds } },
      };
    } else if (audienceConfig.type === 'CUSTOM' && audienceConfig.contactIds?.length > 0) {
      contactQuery.id = { in: audienceConfig.contactIds };
    } else if (audienceConfig.type === 'EVENT_GUESTS' && campaign.eventId) {
      const guestWhere: any = { eventId: campaign.eventId };
      if (audienceConfig.rsvpFilter && audienceConfig.rsvpFilter.length > 0) {
        guestWhere.rsvpStatus = { in: audienceConfig.rsvpFilter };
      }
      const guests = await this.prisma.eventGuest.findMany({
        where: guestWhere,
        select: { contactId: true },
      });
      contactQuery.id = { in: guests.map((g) => g.contactId) };
    }

    const allMatchedContacts = await this.prisma.contact.findMany({
      where: contactQuery,
      include: {
        groupMembers: { include: { group: true } },
      },
    });

    // Suppression list
    const suppressed = await this.prisma.suppressionEntry.findMany({
      where: { organizationId },
      select: { phoneNumber: true },
    });
    const suppressedSet = new Set(suppressed.map((s) => s.phoneNumber));

    const totalMatched = allMatchedContacts.length;
    const optedIn = allMatchedContacts.filter((c) => c.marketingOptIn && !c.optedOut && !suppressedSet.has(c.phoneNumber));
    const optedOut = allMatchedContacts.filter((c) => c.optedOut);
    const suppressedContacts = allMatchedContacts.filter((c) => suppressedSet.has(c.phoneNumber));

    return {
      totalMatched,
      eligibleRecipients: optedIn.length,
      optedOutCount: optedOut.length,
      suppressedCount: suppressedContacts.length,
      sampleRecipients: optedIn.slice(0, 5).map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phoneNumber: c.phoneNumber,
        company: c.company,
      })),
    };
  }

  /**
   * Validates full campaign readiness before launching
   */
  async validateCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.getById(organizationId, campaignId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. WhatsApp Session
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { id: campaign.whatsappSessionId, organizationId },
    });

    if (!session) {
      errors.push('Assigned WhatsApp session does not exist');
    } else if (session.status !== WhatsAppSessionStatus.CONNECTED) {
      errors.push(`WhatsApp session "${session.displayName}" is not connected (current: ${session.status})`);
    }

    // 2. Audience Check
    const audience = await this.calculateAudience(organizationId, campaignId);
    if (audience.eligibleRecipients === 0) {
      errors.push('Target audience has 0 eligible recipients after applying opt-in and suppression filters');
    }

    // 3. Template & Variables
    if (!campaign.messageContent || campaign.messageContent.trim().length === 0) {
      errors.push('Message content is empty');
    }

    const variables = extractTemplateVariables(campaign.messageContent);
    if (variables.includes('rsvpUrl') && !campaign.eventId) {
      errors.push('Template contains {{rsvpUrl}} but no Event is attached to this campaign');
    }

    return {
      ready: errors.length === 0,
      errors,
      warnings,
      audienceSummary: audience,
    };
  }

  /**
   * Launches the campaign: creates CampaignMessages and dispatches them
   */
  async launch(organizationId: string, userId: string, campaignId: string) {
    const validation = await this.validateCampaign(organizationId, campaignId);
    if (!validation.ready) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_READY',
          message: 'Campaign cannot be launched. Please resolve validation errors.',
          details: validation.errors,
        },
      });
    }

    const campaign = await this.getById(organizationId, campaignId);
    const audienceConfig = (campaign.targetAudience || {}) as any;

    let contactQuery: any = {
      organizationId,
      marketingOptIn: true,
      optedOut: false,
    };

    if (audienceConfig.type === 'GROUP' && audienceConfig.groupIds?.length > 0) {
      contactQuery.groupMembers = {
        some: { groupId: { in: audienceConfig.groupIds } },
      };
    } else if (audienceConfig.type === 'CUSTOM' && audienceConfig.contactIds?.length > 0) {
      contactQuery.id = { in: audienceConfig.contactIds };
    } else if (audienceConfig.type === 'EVENT_GUESTS' && campaign.eventId) {
      const guests = await this.prisma.eventGuest.findMany({
        where: { eventId: campaign.eventId },
        select: { contactId: true },
      });
      contactQuery.id = { in: guests.map((g) => g.contactId) };
    }

    // Load contacts and suppression list
    const [contacts, suppressed] = await Promise.all([
      this.prisma.contact.findMany({ where: contactQuery }),
      this.prisma.suppressionEntry.findMany({
        where: { organizationId },
        select: { phoneNumber: true },
      }),
    ]);

    const suppressedSet = new Set(suppressed.map((s) => s.phoneNumber));
    const eligibleContacts = contacts.filter((c) => !suppressedSet.has(c.phoneNumber));

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    // Prepare message records
    const messageRecords: any[] = [];
    const event = campaign.event;

    for (const contact of eligibleContacts) {
      let eventGuestId: string | null = null;
      let rsvpUrl = '';

      if (event) {
        // Find or create EventGuest with unique token
        let guest = await this.prisma.eventGuest.findUnique({
          where: {
            eventId_contactId: {
              eventId: event.id,
              contactId: contact.id,
            },
          },
        });

        if (!guest) {
          guest = await this.prisma.eventGuest.create({
            data: {
              eventId: event.id,
              contactId: contact.id,
              uniqueToken: generateSecureToken(12),
              invitationStatus: InvitationStatus.QUEUED,
              rsvpStatus: RSVPStatus.PENDING,
            },
          });
        }

        eventGuestId = guest.id;
        rsvpUrl = `${appUrl}/rsvp/${guest.uniqueToken}`;
      }

      // Build variables dictionary
      const variables: Record<string, any> = {
        firstName: contact.firstName,
        lastName: contact.lastName || '',
        fullName: contact.fullName,
        company: contact.company || '',
        companyName: org?.name || 'EventBlast',
        senderName: org?.name || 'Event Organizer',
        rsvpUrl,
        ...(event
          ? {
              eventName: event.name,
              eventDate: format(new Date(event.startAt), 'dd MMMM yyyy'),
              eventTime: format(new Date(event.startAt), 'hh:mm a'),
              venue: event.venueName,
              eventAddress: event.venueAddress,
              mapsUrl: event.mapsUrl || '',
            }
          : {}),
        custom: contact.customFields || {},
      };

      const { rendered } = renderTemplateVariables(campaign.messageContent, variables, true);

      messageRecords.push({
        campaignId: campaign.id,
        contactId: contact.id,
        eventGuestId,
        sessionId: campaign.whatsappSessionId,
        renderedMessage: rendered,
        mediaUrl: campaign.mediaUrl,
        mediaType: campaign.mediaType,
        status: CampaignMessageStatus.QUEUED,
      });
    }

    // Atomic transaction: mark campaign running & create messages
    await this.prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          status: CampaignStatus.RUNNING,
          startedAt: new Date(),
          totalRecipients: messageRecords.length,
        },
      });

      // Insert messages in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < messageRecords.length; i += chunkSize) {
        const chunk = messageRecords.slice(i, i + chunkSize);
        await tx.campaignMessage.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_LAUNCH,
      resourceType: 'Campaign',
      resourceId: campaign.id,
      metadata: { totalRecipients: messageRecords.length },
    });

    // Execute message dispatch (asynchronous worker / mock dispatcher)
    this.dispatchCampaignMessages(campaign.id, organizationId).catch((err) => {
      this.logger.error(`Error during campaign dispatch execution: ${err.message}`);
    });

    return {
      success: true,
      campaignId: campaign.id,
      status: CampaignStatus.RUNNING,
      totalRecipients: messageRecords.length,
    };
  }

  /**
   * Internal dispatcher that processes queued campaign messages with throttling and retry logic
   */
  private async dispatchCampaignMessages(campaignId: string, organizationId: string) {
    const messages = await this.prisma.campaignMessage.findMany({
      where: { campaignId, status: CampaignMessageStatus.QUEUED },
      include: {
        contact: true,
        campaign: { include: { whatsappSession: true } },
      },
    });

    const minDelay = parseInt(this.configService.get<string>('MESSAGE_MIN_DELAY_MS') || '1000', 10);

    for (const msg of messages) {
      // Re-verify campaign is still running (has not been paused, cancelled or emergency stopped)
      const currentCampaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (!currentCampaign || currentCampaign.status !== CampaignStatus.RUNNING) {
        this.logger.warn(`Campaign ${campaignId} status is ${currentCampaign?.status}. Stopping message dispatch.`);
        break;
      }

      try {
        await this.prisma.campaignMessage.update({
          where: { id: msg.id },
          data: { status: CampaignMessageStatus.SENDING, attemptCount: { increment: 1 } },
        });

        // Send via WhatsApp Service
        const sendResult = await this.whatsappService.sendTestMessage(
          organizationId,
          msg.sessionId,
          msg.contact.phoneNumber,
          msg.renderedMessage,
          msg.mediaUrl,
          msg.mediaType,
        );

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
      } catch (err: any) {
        await this.prisma.campaignMessage.update({
          where: { id: msg.id },
          data: {
            status: CampaignMessageStatus.FAILED,
            failedAt: new Date(),
            failureReason: err.message,
          },
        });
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      // Operational throttle delay between messages
      await new Promise((resolve) => setTimeout(resolve, minDelay));
    }

    // Check if all messages sent to mark campaign COMPLETED
    const remaining = await this.prisma.campaignMessage.count({
      where: { campaignId, status: { in: [CampaignMessageStatus.QUEUED, CampaignMessageStatus.SENDING] } },
    });

    if (remaining === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
      });
    }
  }

  async pause(organizationId: string, userId: string, id: string) {
    const campaign = await this.getById(organizationId, id);
    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Only running campaigns can be paused');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_PAUSE,
      resourceType: 'Campaign',
      resourceId: id,
    });

    return updated;
  }

  async resume(organizationId: string, userId: string, id: string) {
    const campaign = await this.getById(organizationId, id);
    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.RUNNING },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_RESUME,
      resourceType: 'Campaign',
      resourceId: id,
    });

    this.dispatchCampaignMessages(id, organizationId).catch((err) => {
      this.logger.error(`Error resuming campaign dispatch: ${err.message}`);
    });

    return updated;
  }

  async emergencyStop(organizationId: string, userId: string, id: string) {
    const campaign = await this.getById(organizationId, id);

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });

    await this.prisma.campaignMessage.updateMany({
      where: { campaignId: id, status: { in: [CampaignMessageStatus.QUEUED, CampaignMessageStatus.SENDING] } },
      data: { status: CampaignMessageStatus.FAILED, failureReason: 'Emergency stop activated by operator' },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.CAMPAIGN_EMERGENCY_STOP,
      resourceType: 'Campaign',
      resourceId: id,
      metadata: { timestamp: new Date() },
    });

    return updated;
  }
}
