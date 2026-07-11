import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'OpenCode Zen';
  apiDocs = [['API Docs', 'https://opencode.ai/docs/zen']];
  interval = ProviderIntervals.STANDARD;

  getUrl(_options: BaseProvider.Options, _apiKey: string): string {
    return 'https://opencode.ai/zen/v1/balance';
  }

  getMethod(): 'GET' | 'POST' {
    return 'GET';
  }

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  getBody(_apiKey: string): string | null {
    return null;
  }

  parseData(data: unknown): BalanceData {
    const d = data as { balance?: number; currency?: string };

    return {
      available: d.balance ?? 0,
      currency: d.currency?.toUpperCase() || 'USD',
    };
  }
}