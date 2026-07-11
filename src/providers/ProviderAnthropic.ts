import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'Anthropic';
  apiDocs = [['API Docs', 'https://docs.anthropic.com/en/api']];
  interval = ProviderIntervals.STANDARD;

  getUrl(_options: BaseProvider.Options, _apiKey: string): string {
    return 'https://api.anthropic.com/v1/organizations/me/usage';
  }

  getMethod(): 'GET' | 'POST' {
    return 'GET';
  }

  getHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  getBody(_apiKey: string): string | null {
    return null;
  }

  parseData(data: unknown): BalanceData {
    const d = data as { costs?: Array<{ amount: number; currency: string }> };

    if (!d.costs || d.costs.length === 0) {
      return { available: 0, currency: 'USD' };
    }

    const latestCost = d.costs[0];
    return {
      available: 0,
      used: latestCost.amount,
      currency: latestCost.currency?.toUpperCase() || 'USD',
    };
  }
}
