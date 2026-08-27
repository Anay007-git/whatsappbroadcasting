import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import {
  WhatsAppProvider,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
  SendTextParams,
  SendMediaParams,
  SendMessageResult,
  MediaType,
} from '@eventblast/types';

export class BaileysWhatsAppProvider implements WhatsAppProvider {
  private sockets: Map<string, WASocket> = new Map();
  private sessionState: Map<
    string,
    {
      status: WhatsAppSessionStatus;
      phoneNumber?: string;
      qrCode?: string;
      lastUpdated: Date;
    }
  > = new Map();

  private getAuthDir(sessionId: string): string {
    const authDir = path.join(process.cwd(), '.baileys_auth', sessionId);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    return authDir;
  }

  private formatJid(phone: string): string {
    const cleaned = phone.replace(/[^\d]/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }

  async createSession(sessionId: string): Promise<WhatsAppSessionInfo> {
    await this.startSession(sessionId);
    return this.getSessionStatus(sessionId);
  }

  async startSession(sessionId: string): Promise<void> {
    if (this.sockets.has(sessionId)) {
      return;
    }

    const authDir = this.getAuthDir(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.sessionState.set(sessionId, {
      status: WhatsAppSessionStatus.INITIALIZING,
      lastUpdated: new Date(),
    });

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
      browser: ['EventBlast Enterprise', 'Chrome', '124.0.0'],
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate real multi-device cryptographic QR Data URL
        try {
          const qrDataUrl = await QRCode.toDataURL(qr);
          const current = this.sessionState.get(sessionId) || { status: WhatsAppSessionStatus.QR_READY, lastUpdated: new Date() };
          current.qrCode = qrDataUrl;
          current.status = WhatsAppSessionStatus.QR_READY;
          current.lastUpdated = new Date();
          this.sessionState.set(sessionId, current);
        } catch (err) {
          // Ignore QR generation error
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0];

        this.sessionState.set(sessionId, {
          status: WhatsAppSessionStatus.CONNECTED,
          phoneNumber: phone ? `+${phone}` : undefined,
          qrCode: undefined,
          lastUpdated: new Date(),
        });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

        this.sessionState.set(sessionId, {
          status: WhatsAppSessionStatus.DISCONNECTED,
          lastUpdated: new Date(),
        });

        this.sockets.delete(sessionId);

        if (shouldReconnect) {
          setTimeout(() => this.startSession(sessionId), 3000);
        }
      }
    });

    this.sockets.set(sessionId, sock);
  }

  async stopSession(sessionId: string): Promise<void> {
    const sock = this.sockets.get(sessionId);
    if (sock) {
      await sock.logout();
      this.sockets.delete(sessionId);
    }
    this.sessionState.set(sessionId, {
      status: WhatsAppSessionStatus.DISCONNECTED,
      lastUpdated: new Date(),
    });
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSessionInfo> {
    const cached = this.sessionState.get(sessionId);
    if (!cached && !this.sockets.has(sessionId)) {
      // Auto-start socket in background to retrieve status or QR
      this.startSession(sessionId).catch(() => {});
    }

    return {
      sessionId,
      status: cached?.status || WhatsAppSessionStatus.INITIALIZING,
      phoneNumber: cached?.phoneNumber,
      qrCode: cached?.qrCode,
    };
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    const cached = this.sessionState.get(sessionId);
    if (cached?.qrCode) {
      return cached.qrCode;
    }
    if (!this.sockets.has(sessionId)) {
      await this.startSession(sessionId);
    }
    return this.sessionState.get(sessionId)?.qrCode || null;
  }

  async sendText(params: SendTextParams): Promise<SendMessageResult> {
    const { sessionId, to, text } = params;
    let sock = this.sockets.get(sessionId);

    if (!sock) {
      await this.startSession(sessionId);
      sock = this.sockets.get(sessionId);
    }

    if (!sock) {
      return {
        success: false,
        status: 'FAILED',
        error: 'WhatsApp socket connection is not ready.',
        timestamp: new Date(),
      };
    }

    try {
      const cleaned = to.replace(/[^\d]/g, '');
      const jid = `${cleaned}@s.whatsapp.net`;

      try {
        const check = await sock.onWhatsApp(cleaned);
        if (check && check.length > 0 && !check[0]?.exists) {
          return {
            success: false,
            status: 'FAILED',
            error: `Number +${cleaned} is not registered on WhatsApp`,
            timestamp: new Date(),
          };
        }
      } catch (err) {}

      const res = await sock.sendMessage(jid, { text });
      const messageId = res?.key?.id || `baileys_${Date.now()}`;

      return {
        success: true,
        providerMessageId: messageId,
        status: 'SENT',
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'FAILED',
        error: error?.message || 'Failed to send message via Baileys',
        timestamp: new Date(),
      };
    }
  }

  async sendMedia(params: SendMediaParams): Promise<SendMessageResult> {
    const { sessionId, to, mediaUrl, mediaType, caption } = params;
    let sock = this.sockets.get(sessionId);

    if (!sock) {
      await this.startSession(sessionId);
      sock = this.sockets.get(sessionId);
    }

    if (!sock) {
      return {
        success: false,
        status: 'FAILED',
        error: 'WhatsApp socket connection is not ready.',
        timestamp: new Date(),
      };
    }

    try {
      const jid = this.formatJid(to);
      let content: any = {};

      if (mediaType === MediaType.IMAGE) {
        content = { image: { url: mediaUrl }, caption: caption || '' };
      } else if (mediaType === MediaType.VIDEO) {
        content = { video: { url: mediaUrl }, caption: caption || '' };
      } else {
        content = { document: { url: mediaUrl }, caption: caption || '' };
      }

      const res = await sock.sendMessage(jid, content);
      const messageId = res?.key?.id || `baileys_media_${Date.now()}`;

      return {
        success: true,
        providerMessageId: messageId,
        status: 'SENT',
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'FAILED',
        error: error?.message || 'Failed to send media via Baileys',
        timestamp: new Date(),
      };
    }
  }
}
