import * as BaseProvider from './BaseProvider';
import { ProviderIntervals } from '../defaults';
import { BalanceData } from '../types';

export class Api extends BaseProvider.Api {
  apiName = 'OpenAI';
  apiDocs = [['API Docs', 'https://platform.openai.com/docs/api-reference']];
  interval = ProviderIntervals.STANDARD;

  getUrl(_options: BaseProvider.Options, _apiKey: string): string {
    return 'https://api.openai.com/v1/usage';
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
    const d = data as { total_usage?: number; has_more?: boolean; data?: Array<{ line_items?: Array<{ cost?: number }> }> };

    let totalUsage = d.total_usage ?? 0;

    if (d.data && d.data.length > 0) {
      const latestEntry = d.data[0];
      if (latestEntry.line_items) {
        totalUsage = latestEntry.line_items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
      }
    }

    return {
      available: 0,
      used: totalUsage / 100,
      currency: 'USD',
    };
  }
}