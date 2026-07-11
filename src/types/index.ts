export interface BalanceData {
  available: number;
  currency: string;
  used?: number;
  total?: number;
}

export interface AccountOptions {
  provider: string;
  label?: string;
  interval?: number;
  format?: string;
  extraParams?: Record<string, string>;
}

export interface ProviderOptions extends AccountOptions {
  apiKey: string;
  extraParams?: Record<string, string>;
}

export interface PriceData {
  date: Date;
  value: number;
}