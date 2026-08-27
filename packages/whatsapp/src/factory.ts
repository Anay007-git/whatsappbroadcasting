import { WhatsAppProvider, WhatsAppProviderType } from '@eventblast/types';
import { OpenWAProvider, OpenWAConfig } from './openwa.provider';
import { MockWhatsAppProvider } from './mock.provider';
import { MetaCloudWhatsAppProvider, MetaCloudConfig } from './meta-cloud.provider';
import { BaileysWhatsAppProvider } from './baileys.provider';

export interface ProviderFactoryOptions {
  openwaConfig?: OpenWAConfig;
  metaCloudConfig?: MetaCloudConfig;
}

export class WhatsAppProviderFactory {
  private static instances: Map<string, WhatsAppProvider> = new Map();

  static getProvider(type: WhatsAppProviderType, options?: ProviderFactoryOptions): WhatsAppProvider {
    const cacheKey = `${type}_${options?.openwaConfig?.baseUrl || options?.metaCloudConfig?.phoneNumberId || 'default'}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    let provider: WhatsAppProvider;

    switch (type) {
      case WhatsAppProviderType.META_CLOUD:
        provider = new MetaCloudWhatsAppProvider(
          options?.metaCloudConfig || {
            phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
            accessToken: process.env.META_ACCESS_TOKEN || '',
          },
        );
        break;

      case WhatsAppProviderType.OPENWA:
        // Use native Baileys Multi-Device engine for genuine 2@... QR codes
        provider = new BaileysWhatsAppProvider();
        break;

      case WhatsAppProviderType.MOCK:
      default:
        provider = new MockWhatsAppProvider();
        break;
    }

    this.instances.set(cacheKey, provider);
    return provider;
  }
}
