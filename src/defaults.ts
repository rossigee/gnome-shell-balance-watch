export const Defaults = {
  provider: 'openai',
  interval: 300,
  format: '{provider} {v} {cs}',
};

export const ProviderIntervals = {
  STANDARD: 300,
  CAUTIOUS: 600,
} as const;

export const CurrencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  credits: '',
};