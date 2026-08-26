import { WhatsAppProvider, WhatsAppProviderType } from '@eventblast/types';
import { OpenWAProvider, OpenWAConfig } from './openwa.provider';
import { MockWhatsAppProvider } from './mock.provider';

export interface ProviderFactoryOptions {
  openwaConfig?: OpenWAConfig;
}

export class WhatsAppProviderFactory {
  private static instances: Map<string, WhatsAppProvider> = new Map();

  static getProvider(type: WhatsAppProviderType, options?: ProviderFactoryOptions): WhatsAppProvider {
    const cacheKey = `${type}_${options?.openwaConfig?.baseUrl || 'default'}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    let provider: WhatsAppProvider;

    switch (type) {
      case WhatsAppProviderType.OPENWA:
        if (!options?.openwaConfig?.baseUrl) {
          throw new Error('OPENWA_BASE_URL is required when using OpenWA provider');
        }
        provider = new OpenWAProvider(options.openwaConfig);
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
