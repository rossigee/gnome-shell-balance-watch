import { BalanceData } from '../types';

export function throwNoData(field: string, value: string): never {
  throw new Error(`no data for ${field} ${value}`);
}

export function throwApiError(errorValue: string | undefined): never {
  throw new Error(errorValue || 'unknown error');
}

export interface Options {
  provider: string;
  label?: string;
  interval?: number;
  format?: string;
  extraParams?: Record<string, string>;
}

export abstract class Api {
  abstract apiName: string;
  abstract apiDocs: string[][];
  interval = 300;

  getLabel({ label }: Options): string {
    return label || this.apiName;
  }

  abstract getUrl(options: Options, apiKey: string): string;

  abstract getMethod(): 'GET' | 'POST';

  abstract getHeaders(apiKey: string): Record<string, string>;

  getBody(_apiKey: string, _options?: Options): string | null {
    return null;
  }

  abstract parseData(data: unknown): BalanceData;

  getDefaultOptions(): Options {
    return {
      provider: this.apiName.toLowerCase().replace(/\s+/g, '-'),
      label: this.apiName,
      interval: this.interval,
      format: '{provider} {v} {cs}',
    };
  }
}
