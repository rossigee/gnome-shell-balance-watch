import { CurrencySymbols } from '../defaults';
import { BalanceData } from '../types';

export function format(data: BalanceData | undefined, provider: string, formatStr: string): string {
  if (!data) {
    return provider + ' ...';
  }

  const value = data.available;
  const currencySymbol = CurrencySymbols[data.currency] || data.currency;

  const formatData: Record<string, unknown> = {
    provider,
    v: formatValue(value),
    raw: value,
    cs: currencySymbol,
    currency: data.currency,
  };

  return formatStr.replace(/\{(\w+)\}/g, (_, key) => String(formatData[key] ?? ''));
}

function formatValue(value: number): string {
  if (value === 0) {
    return '0.00';
  }

  if (value >= 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function tooltipText(_: (v: string) => string): string {
  return [
    '{provider}  - Provider name',
    '{v}        - Balance value',
    '{cs}       - Currency symbol',
    '{currency} - Currency code',
    '{raw}      - Raw balance number',
  ].join('\n');
}