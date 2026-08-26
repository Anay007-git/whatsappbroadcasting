import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WhatsAppProviderFactory } from '@eventblast/whatsapp';
import { WhatsAppProviderType, WhatsAppSessionStatus, AuditAction, MediaType } from '@prisma/client';
import { WhatsAppProvider, WhatsAppProviderType as TypesWhatsAppProviderType, WhatsAppSessionStatus as TypesWhatsAppSessionStatus } from '@eventblast/types';
import { normalizePhoneNumber } from '@eventblast/shared';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  private getProviderInstance(type: WhatsAppProviderType) {
    const openwaBaseUrl = this.configService.get<string>('OPENWA_BASE_URL') || 'http://localhost:2785';
    const openwaApiKey = this.configService.get<string>('OPENWA_API_KEY');
    const openwaWebhookSecret = this.configService.get<string>('OPENWA_WEBHOOK_SECRET');

    return WhatsAppProviderFactory.getProvider(type as unknown as TypesWhatsAppProviderType, {
      openwaConfig: {
        baseUrl: openwaBaseUrl,
        apiKey: openwaApiKey,
        webhookSecret: openwaWebhookSecret,
      },
    });
  }

  async listSessions(organizationId: string) {
    return this.prisma.whatsAppSession.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSessionById(organizationId: string, id: string) {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { id, organizationId },
    });

    if (!session) {
      throw new NotFoundException('WhatsApp session not found');
    }

    return session;
  }

  async createSession(
    organizationId: string,
    userId: string,
    displayName: string,
    provider: WhatsAppProviderType = WhatsAppProviderType.MOCK,
  ) {
    const providerSessionId = `sess_${organizationId.slice(0, 8)}_${Date.now()}`;

    const session = await this.prisma.whatsAppSession.create({
      data: {
        organizationId,
        provider,
        providerSessionId,
        displayName,
        status: WhatsAppSessionStatus.INITIALIZING,
      },
    });

    // Initialize provider session
    try {
      const providerInstance = this.getProviderInstance(provider);
      const info = await providerInstance.createSession(providerSessionId);

      const updated = await this.prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status: info.status as unknown as WhatsAppSessionStatus,
          qrCode: info.qrCode,
          phoneNumber: info.phoneNumber,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: AuditAction.WHATSAPP_CONNECT,
        resourceType: 'WhatsAppSession',
        resourceId: session.id,
        metadata: { displayName, provider, providerSessionId },
      });

      return updated;
    } catch (e: any) {
      this.logger.error(`Error initializing WhatsApp provider session: ${e.message}`);
      return session;
    }
  }

  async startSession(organizationId: string, userId: string, id: string) {
    const session = await this.getSessionById(organizationId, id);
    const providerInstance = this.getProviderInstance(session.provider);

    await providerInstance.startSession(session.providerSessionId);
    const info = await providerInstance.getSessionStatus(session.providerSessionId);

    const updated = await this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: info.status as unknown as WhatsAppSessionStatus,
        phoneNumber: info.phoneNumber || session.phoneNumber,
        qrCode: info.qrCode,
        lastSeenAt: new Date(),
      },
    });

    return updated;
  }

  async stopSession(organizationId: string, userId: string, id: string) {
    const session = await this.getSessionById(organizationId, id);
    const providerInstance = this.getProviderInstance(session.provider);

    await providerInstance.stopSession(session.providerSessionId);

    const updated = await this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        qrCode: null,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: AuditAction.WHATSAPP_DISCONNECT,
      resourceType: 'WhatsAppSession',
      resourceId: id,
      metadata: { displayName: session.displayName },
    });

    return updated;
  }

  async getQRCode(organizationId: string, id: string) {
    const session = await this.getSessionById(organizationId, id);
    const providerInstance = this.getProviderInstance(session.provider);

    const qrCode = await providerInstance.getQRCode(session.providerSessionId);
    if (qrCode) {
      await this.prisma.whatsAppSession.update({
        where: { id },
        data: { qrCode, status: WhatsAppSessionStatus.QR_READY },
      });
    }

    return { qrCode, status: session.status };
  }

  async syncStatus(organizationId: string, id: string) {
    const session = await this.getSessionById(organizationId, id);
    const providerInstance = this.getProviderInstance(session.provider);

    const info = await providerInstance.getSessionStatus(session.providerSessionId);

    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: info.status as unknown as WhatsAppSessionStatus,
        phoneNumber: info.phoneNumber || session.phoneNumber,
        qrCode: info.qrCode,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Sends test message to a specified administrator number
   */
  async sendTestMessage(
    organizationId: string,
    sessionId: string,
    phoneNumber: string,
    messageContent: string,
    mediaUrl?: string | null,
    mediaType?: MediaType | null,
  ) {
    const session = await this.getSessionById(organizationId, sessionId);
    if (session.status !== WhatsAppSessionStatus.CONNECTED) {
      throw new BadRequestException(`WhatsApp session is not connected (current state: ${session.status})`);
    }

    const providerInstance = this.getProviderInstance(session.provider);
    const normalizedTo = normalizePhoneNumber(phoneNumber);

    if (mediaUrl && mediaType) {
      return providerInstance.sendMedia({
        sessionId: session.providerSessionId,
        to: normalizedTo,
        mediaUrl,
        mediaType: mediaType as any,
        caption: messageContent,
      });
    }

    return providerInstance.sendText({
      sessionId: session.providerSessionId,
      to: normalizedTo,
      text: messageContent,
    });
  }
}
