import QRCode from 'qrcode';
import {
  WhatsAppProvider,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
  SendTextParams,
  SendMediaParams,
  SendMessageResult,
} from '@eventblast/types';

export class MockWhatsAppProvider implements WhatsAppProvider {
  private sessions: Map<
    string,
    {
      status: WhatsAppSessionStatus;
      phoneNumber?: string;
      qrCode?: string;
      createdAt: Date;
    }
  > = new Map();

  async createSession(sessionId: string): Promise<WhatsAppSessionInfo> {
    const qrData = `mock-whatsapp-auth-token-${sessionId}-${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);

    this.sessions.set(sessionId, {
      status: WhatsAppSessionStatus.QR_READY,
      phoneNumber: '+919876543210',
      qrCode,
      createdAt: new Date(),
    });

    return {
      sessionId,
      status: WhatsAppSessionStatus.QR_READY,
      phoneNumber: '+919876543210',
      qrCode,
      battery: 95,
      plugged: true,
    };
  }

  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = WhatsAppSessionStatus.CONNECTED;
      this.sessions.set(sessionId, session);
    } else {
      await this.createSession(sessionId);
      const updated = this.sessions.get(sessionId)!;
      updated.status = WhatsAppSessionStatus.CONNECTED;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = WhatsAppSessionStatus.DISCONNECTED;
      this.sessions.set(sessionId, session);
    }
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSessionInfo> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      return this.createSession(sessionId);
    }

    return {
      sessionId,
      status: session.status,
      phoneNumber: session.phoneNumber,
      qrCode: session.qrCode,
      battery: 88,
      plugged: false,
    };
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    let session = this.sessions.get(sessionId);
    if (!session || !session.qrCode) {
      const info = await this.createSession(sessionId);
      return info.qrCode || null;
    }
    return session.qrCode;
  }

  async sendText(params: SendTextParams): Promise<SendMessageResult> {
    const { sessionId, to, text } = params;

    // Simulate potential failure for test number +910000000000
    if (to.includes('0000000000')) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Simulated destination number unreachable',
        timestamp: new Date(),
      };
    }

    const providerMessageId = `mock_msg_${sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      timestamp: new Date(),
    };
  }

  async sendMedia(params: SendMediaParams): Promise<SendMessageResult> {
    const { sessionId, to, mediaUrl } = params;

    if (to.includes('0000000000')) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Simulated destination number unreachable',
        timestamp: new Date(),
      };
    }

    const providerMessageId = `mock_media_${sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      timestamp: new Date(),
    };
  }
}
