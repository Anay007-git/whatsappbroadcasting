import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) {}

  async listRules(organizationId: string, eventId?: string) {
    const where: any = { organizationId };
    if (eventId) where.eventId = eventId;

    return this.prisma.automationRule.findMany({
      where,
      include: {
        event: { select: { name: true } },
        template: { select: { name: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(
    organizationId: string,
    eventId: string,
    triggerOffsetHours: number,
    templateId: string,
    conditionFilter: any = {},
  ) {
    return this.prisma.automationRule.create({
      data: {
        organizationId,
        eventId,
        triggerType: 'HOURS_BEFORE_START',
        triggerOffsetHours,
        templateId,
        conditionFilter,
        actionType: 'SEND_REMINDER_CAMPAIGN',
      },
    });
  }

  async toggleRule(organizationId: string, ruleId: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return this.prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive: !rule.isActive },
    });
  }

  async deleteRule(organizationId: string, ruleId: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    await this.prisma.automationRule.delete({ where: { id: ruleId } });
    return { deleted: true, id: ruleId };
  }
}
