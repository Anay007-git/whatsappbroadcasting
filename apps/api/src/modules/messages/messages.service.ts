import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignMessageStatus } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async list(
    organizationId: string,
    campaignId?: string,
    status?: CampaignMessageStatus,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      campaign: { organizationId },
    };

    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.campaignMessage.count({ where }),
      this.prisma.campaignMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: { id: true, fullName: true, phoneNumber: true, company: true },
          },
          campaign: {
            select: { id: true, name: true, campaignType: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async retryMessage(organizationId: string, messageId: string) {
    const message = await this.prisma.campaignMessage.findFirst({
      where: {
        id: messageId,
        campaign: { organizationId },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.campaignMessage.update({
      where: { id: messageId },
      data: {
        status: CampaignMessageStatus.QUEUED,
        failureReason: null,
        failedAt: null,
      },
    });
  }
}
