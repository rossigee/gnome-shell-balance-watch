import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'OpenRouter';
  apiDocs = [['API Docs', 'https://openrouter.ai/docs']];
  interval = ProviderIntervals.STANDARD;

  getUrl(_options: BaseProvider.Options, _apiKey: string): string {
    return 'https://openrouter.ai/api/v1/credits';
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
    const d = data as { data?: { total_usage?: number; balance?: number } };

    return {
      available: d.data?.balance ?? 0,
      used: d.data?.total_usage ?? 0,
      currency: 'USD',
    };
  }
}