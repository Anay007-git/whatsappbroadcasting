import axios, { AxiosInstance } from 'axios';
import {
  WhatsAppProvider,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
  SendTextParams,
  SendMediaParams,
  SendMessageResult,
  MediaType,
} from '@eventblast/types';

export interface OpenWAConfig {
  baseUrl: string;
  apiKey?: string;
  webhookSecret?: string;
  timeoutMs?: number;
}

export class OpenWAProvider implements WhatsAppProvider {
  private client: AxiosInstance;
  private config: OpenWAConfig;

  constructor(config: OpenWAConfig) {
    this.config = {
      timeoutMs: 15000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl.replace(/\/$/, ''),
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'api_key': this.config.apiKey, 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
    });
  }

  /**
   * Helper to format phone number to OpenWA JID format (e.g. 919876543210@c.us)
   */
  private formatJid(phone: string): string {
    const cleaned = phone.replace(/[^\d]/g, '');
    return `${cleaned}@c.us`;
  }

  async createSession(sessionId: string): Promise<WhatsAppSessionInfo> {
    try {
      const response = await this.client.post(`/api/sessions/create`, { sessionId });
      return {
        sessionId,
        status: WhatsAppSessionStatus.INITIALIZING,
        phoneNumber: response.data?.phoneNumber,
        qrCode: response.data?.qr,
      };
    } catch (error: any) {
      // Fallback: If session create returns 409 or similar, get current status
      return this.getSessionStatus(sessionId);
    }
  }

  async startSession(sessionId: string): Promise<void> {
    try {
      await this.client.post(`/api/${sessionId}/start-session`);
    } catch (error: any) {
      throw new Error(`Failed to start OpenWA session ${sessionId}: ${error.response?.data?.message || error.message}`);
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      await this.client.post(`/api/${sessionId}/logout`);
    } catch (error: any) {
      throw new Error(`Failed to stop OpenWA session ${sessionId}: ${error.response?.data?.message || error.message}`);
    }
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSessionInfo> {
    try {
      const response = await this.client.get(`/api/${sessionId}/status`);
      const data = response.data;
      
      let status = WhatsAppSessionStatus.DISCONNECTED;
      if (data?.state === 'CONNECTED' || data?.status === 'isLogged' || data?.logged) {
        status = WhatsAppSessionStatus.CONNECTED;
      } else if (data?.state === 'QR' || data?.qr) {
        status = WhatsAppSessionStatus.QR_READY;
      } else if (data?.state === 'STARTING') {
        status = WhatsAppSessionStatus.INITIALIZING;
      }

      return {
        sessionId,
        status,
        phoneNumber: data?.me?.user || data?.phoneNumber,
        qrCode: data?.qr,
        battery: data?.battery,
      };
    } catch (error: any) {
      return {
        sessionId,
        status: WhatsAppSessionStatus.DISCONNECTED,
      };
    }
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/api/${sessionId}/get-qr`);
      return response.data?.qr || response.data?.qrCode || null;
    } catch (error: any) {
      return null;
    }
  }

  async sendText(params: SendTextParams): Promise<SendMessageResult> {
    const { sessionId, to, text } = params;
    const jid = this.formatJid(to);

    try {
      const response = await this.client.post(`/api/${sessionId}/send-message`, {
        to: jid,
        content: text,
      });

      const messageId = response.data?.id || response.data?.messageId || `msg_${Date.now()}`;

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
        error: error.response?.data?.message || error.message || 'Unknown OpenWA send error',
        timestamp: new Date(),
      };
    }
  }

  async sendMedia(params: SendMediaParams): Promise<SendMessageResult> {
    const { sessionId, to, mediaUrl, mediaType, caption, filename } = params;
    const jid = this.formatJid(to);

    try {
      const endpoint = mediaType === MediaType.IMAGE ? `/api/${sessionId}/send-image` : `/api/${sessionId}/send-file-from-url`;
      const response = await this.client.post(endpoint, {
        to: jid,
        url: mediaUrl,
        filename: filename || 'media_attachment',
        caption: caption || '',
      });

      const messageId = response.data?.id || response.data?.messageId || `msg_media_${Date.now()}`;

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
        error: error.response?.data?.message || error.message || 'Unknown OpenWA media send error',
        timestamp: new Date(),
      };
    }
  }
}
