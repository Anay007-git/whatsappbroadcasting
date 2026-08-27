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

  // Message store for getMessage callback (required by Baileys v6+)
  private messageStore: Map<string, proto.IWebMessageInfo> = new Map();

  private getAuthDir(sessionId: string): string {
    const authDir = path.join(process.cwd(), '.baileys_auth', sessionId);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    return authDir;
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
      logger: pino({ level: 'warn' }) as any,
      browser: ['EventBlast', 'Chrome', '124.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      getMessage: async (key) => {
        const stored = this.messageStore.get(key.id || '');
        return stored?.message || undefined;
      },
    });

    sock.ev.on('creds.update', saveCreds);

    // Store sent messages for retry support
    sock.ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (msg.key?.id) {
          this.messageStore.set(msg.key.id, msg);
        }
      }
      // Keep store size reasonable
      if (this.messageStore.size > 1000) {
        const keys = Array.from(this.messageStore.keys());
        for (let i = 0; i < 500; i++) {
          this.messageStore.delete(keys[i]);
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr);
          const current = this.sessionState.get(sessionId) || { status: WhatsAppSessionStatus.QR_READY, lastUpdated: new Date() };
          current.qrCode = qrDataUrl;
          current.status = WhatsAppSessionStatus.QR_READY;
          current.lastUpdated = new Date();
          this.sessionState.set(sessionId, current);
        } catch (err) {}
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0];
        console.log(`[Baileys] Session ${sessionId} CONNECTED as +${phone}`);

        this.sessionState.set(sessionId, {
          status: WhatsAppSessionStatus.CONNECTED,
          phoneNumber: phone ? `+${phone}` : undefined,
          qrCode: undefined,
          lastUpdated: new Date(),
        });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[Baileys] Session ${sessionId} DISCONNECTED (code: ${statusCode}, reconnect: ${shouldReconnect})`);

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
    if (!this.sockets.has(sessionId)) {
      await this.startSession(sessionId);
    }
    return this.sessionState.get(sessionId)?.qrCode || null;
  }

  private formatJid(phone: string): string {
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return `${cleaned}@s.whatsapp.net`;
  }

  async sendText(params: SendTextParams): Promise<SendMessageResult> {
    const { sessionId, to, text } = params;
    let sock = this.sockets.get(sessionId);

    if (!sock) {
      await this.startSession(sessionId);
      await new Promise((r) => setTimeout(r, 3000));
      sock = this.sockets.get(sessionId);
    }

    if (!sock) {
      return {
        success: false,
        status: 'FAILED',
        error: 'WhatsApp socket not ready. Please scan QR code first.',
        timestamp: new Date(),
      };
    }

    const targetJid = this.formatJid(to);
    const cleanedDigits = targetJid.split('@')[0];
    console.log(`[Baileys] Sending to ${targetJid}...`);

    // Verify number is on WhatsApp
    try {
      const check = await sock.onWhatsApp(cleanedDigits);
      console.log(`[Baileys] onWhatsApp(${cleanedDigits}):`, JSON.stringify(check));
      if (check && check.length > 0 && !check[0]?.exists) {
        return {
          success: false,
          status: 'FAILED',
          error: `+${cleanedDigits} is not registered on WhatsApp.`,
          timestamp: new Date(),
        };
      }
    } catch (err: any) {
      console.log(`[Baileys] onWhatsApp check error (continuing): ${err?.message}`);
    }

    // Send the message
    try {
      const res = await sock.sendMessage(targetJid, { text });
      const messageId = res?.key?.id || '';
      console.log(`[Baileys] sendMessage result for ${cleanedDigits}: messageId=${messageId}, status=${res?.status}`);

      if (!messageId) {
        return {
          success: false,
          status: 'FAILED',
          error: 'No message ID returned — message was not accepted by WhatsApp.',
          timestamp: new Date(),
        };
      }

      // Critical: wait for the encrypted message frame to fully transmit
      await new Promise((r) => setTimeout(r, 2000));

      return {
        success: true,
        providerMessageId: messageId,
        status: 'SENT',
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error(`[Baileys] sendMessage FAILED for ${cleanedDigits}:`, error?.message);
      return {
        success: false,
        status: 'FAILED',
        error: error?.message || 'Failed to send message',
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

      await new Promise((r) => setTimeout(r, 2000));

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
