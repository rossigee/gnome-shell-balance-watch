import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'PPQ.AI';
  apiDocs = [['API Docs', 'https://ppq.ai/api-docs']];
  interval = ProviderIntervals.STANDARD;

  getUrl(_options: BaseProvider.Options, _apiKey: string): string {
    return 'https://api.ppq.ai/credits/balance';
  }

  getMethod(): 'GET' | 'POST' {
    return 'POST';
  }

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  getBody(_apiKey: string, options?: BaseProvider.Options): string | null {
    const creditId = options?.extraParams?.credit_id;
    if (!creditId) {
      throw new Error('credit_id is required for PPQ.AI');
    }
    return JSON.stringify({ credit_id: creditId });
  }

  parseData(data: unknown): BalanceData {
    const d = data as { balance?: number; credit_id?: string };

    return {
      available: d.balance ?? 0,
      currency: 'credits',
    };
  }
}
