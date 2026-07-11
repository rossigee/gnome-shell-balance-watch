import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'xAI';
  apiDocs = [['API Docs', 'https://docs.x.ai/developers/rest-api-reference']];
  interval = ProviderIntervals.STANDARD;

  getUrl(options: BaseProvider.Options, _apiKey: string): string {
    const teamId = options.extraParams?.team_id || 'me';
    return `https://management-api.x.ai/v1/billing/teams/${teamId}/prepaid/balance`;
  }

  getMethod(): 'GET' | 'POST' {
    return 'GET';
  }

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  parseData(data: unknown): BalanceData {
    const d = data as { total?: { val: string } };

    if (!d.total) {
      return { available: 0, currency: 'USD' };
    }

    const cents = Math.abs(parseInt(d.total.val, 10) || 0);
    return {
      available: cents / 100,
      currency: 'USD',
    };
  }
}
