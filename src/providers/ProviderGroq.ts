import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'Groq';
  apiDocs = [['API Docs', 'https://console.groq.com/docs/api']];
  interval = ProviderIntervals.STANDARD;

  getUrl(_options: BaseProvider.Options, _apiKey: string): string {
    return 'https://api.groq.com/v1/usage';
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
    const d = data as { total_usage?: number };

    return {
      available: 0,
      used: (d.total_usage ?? 0) / 100,
      currency: 'USD',
    };
  }
}
