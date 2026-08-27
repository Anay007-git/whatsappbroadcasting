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
import QRCode from 'qrcode';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  private getProviderInstance(type: WhatsAppProviderType) {
    return WhatsAppProviderFactory.getProvider(type as unknown as TypesWhatsAppProviderType, {
      openwaConfig: {
        baseUrl: this.configService.get<string>('OPENWA_BASE_URL', 'http://openwa:2785'),
        apiKey: this.configService.get<string>('OPENWA_API_KEY'),
        webhookSecret: this.configService.get<string>('OPENWA_WEBHOOK_SECRET'),
      },
      metaCloudConfig: {
        phoneNumberId: this.configService.get<string>('META_PHONE_NUMBER_ID', ''),
        accessToken: this.configService.get<string>('META_ACCESS_TOKEN', ''),
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
      throw new NotFoundException(`WhatsApp session with ID ${id} not found`);
    }

    return session;
  }

  async createSession(
    organizationId: string,
    userId: string,
    displayName: string,
    provider: WhatsAppProviderType,
  ) {
    const providerSessionId = `sess_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const initialQr = await QRCode.toDataURL(`whatsapp-link-${providerSessionId}`);

    const session = await this.prisma.whatsAppSession.create({
      data: {
        organizationId,
        provider,
        providerSessionId,
        displayName,
        status: WhatsAppSessionStatus.QR_READY,
        qrCode: initialQr,
      },
    });

    try {
      const providerInstance = this.getProviderInstance(provider);
      const sessionInfo = await providerInstance.createSession(providerSessionId);

      const updated = await this.prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status: (sessionInfo.status as unknown as WhatsAppSessionStatus) || WhatsAppSessionStatus.QR_READY,
          phoneNumber: sessionInfo.phoneNumber,
          qrCode: sessionInfo.qrCode || initialQr,
          lastSeenAt: new Date(),
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

    try {
      await providerInstance.startSession(session.providerSessionId);
    } catch (err: any) {
      this.logger.warn(`Could not directly start session: ${err.message}, attempting createSession fallback...`);
      try {
        await providerInstance.createSession(session.providerSessionId);
      } catch (createErr: any) {
        this.logger.error(`Failed to create session fallback: ${createErr.message}`);
      }
    }

    let info: any = { status: WhatsAppSessionStatus.INITIALIZING };
    try {
      info = await providerInstance.getSessionStatus(session.providerSessionId);
    } catch (statusErr: any) {
      this.logger.warn(`Could not get provider session status: ${statusErr.message}`);
    }

    let qrCode = info.qrCode || session.qrCode;
    if (!qrCode && info.status !== WhatsAppSessionStatus.CONNECTED) {
      try {
        qrCode = await providerInstance.getQRCode(session.providerSessionId);
      } catch (qrErr: any) {
        this.logger.warn(`Could not retrieve QR code: ${qrErr.message}`);
      }
    }

    const newStatus = (info.status as unknown as WhatsAppSessionStatus) || 
      (qrCode ? WhatsAppSessionStatus.QR_READY : WhatsAppSessionStatus.INITIALIZING);

    const updated = await this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: newStatus,
        phoneNumber: info.phoneNumber || session.phoneNumber,
        qrCode: qrCode || session.qrCode,
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
    let session = await this.getSessionById(organizationId, sessionId);
    if (session.status !== WhatsAppSessionStatus.CONNECTED) {
      session = await this.prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { status: WhatsAppSessionStatus.CONNECTED, lastSeenAt: new Date() },
      });
    }

    const providerInstance = this.getProviderInstance(session.provider);
    const normalizedTo = normalizePhoneNumber(phoneNumber);

    let result;
    if (mediaUrl && mediaType) {
      result = await providerInstance.sendMedia({
        sessionId: session.providerSessionId,
        to: normalizedTo,
        mediaUrl,
        mediaType: mediaType as any,
        caption: messageContent,
      });
    } else {
      result = await providerInstance.sendText({
        sessionId: session.providerSessionId,
        to: normalizedTo,
        text: messageContent,
      });
    }

    if (!result.success) {
      throw new BadRequestException(result.error || 'WhatsApp message rejected by gateway');
    }

    return result;
  }
}
