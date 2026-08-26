import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RSVPStatus, CampaignMessageStatus, CampaignStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * High-level organization dashboard metrics
   */
  async getDashboardSummary(organizationId: string) {
    const [
      totalEvents,
      activeCampaigns,
      totalContacts,
      totalGuests,
      confirmedGuests,
      whatsappSessions,
      campaigns,
      recentCampaigns,
    ] = await Promise.all([
      this.prisma.event.count({ where: { organizationId } }),
      this.prisma.campaign.count({ where: { organizationId, status: CampaignStatus.RUNNING } }),
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.eventGuest.count({ where: { event: { organizationId } } }),
      this.prisma.eventGuest.count({ where: { event: { organizationId }, rsvpStatus: RSVPStatus.GOING } }),
      this.prisma.whatsAppSession.findMany({
        where: { organizationId },
        select: { id: true, displayName: true, phoneNumber: true, status: true, failureCount: true },
      }),
      this.prisma.campaign.findMany({
        where: { organizationId },
        select: {
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
          rsvpCount: true,
        },
      }),
      this.prisma.campaign.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { name: true } },
        },
      }),
    ]);

    const totalRecipients = campaigns.reduce((acc, c) => acc + c.totalRecipients, 0);
    const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + c.deliveredCount, 0);
    const totalRead = campaigns.reduce((acc, c) => acc + c.readCount, 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + c.failedCount, 0);
    const totalRsvps = campaigns.reduce((acc, c) => acc + c.rsvpCount, 0);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    const failureRate = totalSent > 0 ? Math.round((totalFailed / totalSent) * 100) : 0;
    const rsvpRate = totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0;

    return {
      metrics: {
        totalEvents,
        activeCampaigns,
        totalContacts,
        totalGuests,
        confirmedGuests,
        deliveryRate,
        readRate,
        failureRate,
        rsvpRate,
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
      },
      funnel: [
        { name: 'Recipients', count: totalRecipients, fill: '#6366f1' },
        { name: 'Sent', count: totalSent, fill: '#3b82f6' },
        { name: 'Delivered', count: totalDelivered, fill: '#10b981' },
        { name: 'Read', count: totalRead, fill: '#06b6d4' },
        { name: 'RSVP Confirmed', count: confirmedGuests, fill: '#8b5cf6' },
      ],
      whatsappSessions,
      recentCampaigns,
    };
  }

  /**
   * Detailed analytics for a specific campaign
   */
  async getCampaignAnalytics(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        event: true,
        whatsappSession: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const messages = await this.prisma.campaignMessage.findMany({
      where: { campaignId },
      select: {
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
        failureReason: true,
      },
    });

    const sent = messages.filter((m) => m.sentAt !== null).length;
    const delivered = messages.filter((m) => m.deliveredAt !== null).length;
    const read = messages.filter((m) => m.readAt !== null).length;
    const failed = messages.filter((m) => m.status === CampaignMessageStatus.FAILED).length;
    const queued = messages.filter((m) => m.status === CampaignMessageStatus.QUEUED).length;

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
    const failureRate = sent > 0 ? Math.round((failed / sent) * 100) : 0;

    // Delivery funnel
    const funnel = [
      { step: 'Audience', count: campaign.totalRecipients, percentage: 100 },
      { step: 'Sent', count: sent, percentage: campaign.totalRecipients > 0 ? Math.round((sent / campaign.totalRecipients) * 100) : 0 },
      { step: 'Delivered', count: delivered, percentage: sent > 0 ? Math.round((delivered / sent) * 100) : 0 },
      { step: 'Read', count: read, percentage: delivered > 0 ? Math.round((read / delivered) * 100) : 0 },
      { step: 'RSVP', count: campaign.rsvpCount, percentage: read > 0 ? Math.round((campaign.rsvpCount / read) * 100) : 0 },
    ];

    // Failure reasons breakdown
    const failureReasons: Record<string, number> = {};
    for (const m of messages) {
      if (m.failureReason) {
        failureReasons[m.failureReason] = (failureReasons[m.failureReason] || 0) + 1;
      }
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.campaignType,
        status: campaign.status,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        event: campaign.event ? { id: campaign.event.id, name: campaign.event.name } : null,
      },
      rates: {
        deliveryRate,
        readRate,
        failureRate,
      },
      counts: {
        total: campaign.totalRecipients,
        queued,
        sent,
        delivered,
        read,
        failed,
        rsvp: campaign.rsvpCount,
      },
      funnel,
      failureReasons: Object.entries(failureReasons).map(([reason, count]) => ({ reason, count })),
    };
  }
}
