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

export interface MetaCloudConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  private client: AxiosInstance;
  private config: MetaCloudConfig;

  constructor(config: MetaCloudConfig) {
    this.config = {
      apiVersion: 'v20.0',
      ...config,
    };

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.accessToken}`,
      },
      timeout: 15000,
    });
  }

  private normalizeTo(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  async createSession(sessionId: string): Promise<WhatsAppSessionInfo> {
    return {
      sessionId,
      status: WhatsAppSessionStatus.CONNECTED,
      phoneNumber: this.config.phoneNumberId,
    };
  }

  async startSession(sessionId: string): Promise<void> {
    // Meta Cloud API is always connected via HTTPS REST
  }

  async stopSession(sessionId: string): Promise<void> {
    // Stateless
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSessionInfo> {
    return {
      sessionId,
      status: WhatsAppSessionStatus.CONNECTED,
      phoneNumber: this.config.phoneNumberId,
    };
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    // Meta Cloud API uses Token authentication, no QR scan needed
    return null;
  }

  async sendText(params: SendTextParams): Promise<SendMessageResult> {
    const { to, text } = params;
    const recipient = this.normalizeTo(to);

    try {
      const response = await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      });

      const messageId = response.data?.messages?.[0]?.id || `meta_${Date.now()}`;

      return {
        success: true,
        providerMessageId: messageId,
        status: 'SENT',
        timestamp: new Date(),
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Meta Cloud API send error';

      return {
        success: false,
        status: 'FAILED',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  async sendMedia(params: SendMediaParams): Promise<SendMessageResult> {
    const { to, mediaUrl, mediaType, caption } = params;
    const recipient = this.normalizeTo(to);

    try {
      const typeKey = mediaType === MediaType.IMAGE ? 'image' : mediaType === MediaType.VIDEO ? 'video' : 'document';
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: typeKey,
        [typeKey]: {
          link: mediaUrl,
          caption: caption || undefined,
        },
      };

      const response = await this.client.post('/messages', payload);
      const messageId = response.data?.messages?.[0]?.id || `meta_media_${Date.now()}`;

      return {
        success: true,
        providerMessageId: messageId,
        status: 'SENT',
        timestamp: new Date(),
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Meta Cloud API media error';

      return {
        success: false,
        status: 'FAILED',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }
}
