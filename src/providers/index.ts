import * as BaseProvider from './BaseProvider';

export * as BaseProvider from './BaseProvider';

import * as ProviderOpenAI from './ProviderOpenAI';
import * as ProviderAnthropic from './ProviderAnthropic';
import * as ProviderGroq from './ProviderGroq';
import * as ProviderOpenRouter from './ProviderOpenRouter';
import * as ProviderOpenCodeZen from './ProviderOpenCodeZen';
import * as ProviderPPQ from './ProviderPPQ';
import * as ProviderXAI from './ProviderXAI';

export const Providers: Record<string, BaseProvider.Api> = {
  openai: new ProviderOpenAI.Api(),
  anthropic: new ProviderAnthropic.Api(),
  groq: new ProviderGroq.Api(),
  openrouter: new ProviderOpenRouter.Api(),
  opencodezen: new ProviderOpenCodeZen.Api(),
  ppq: new ProviderPPQ.Api(),
  xai: new ProviderXAI.Api(),
};

export type ProviderKey = keyof typeof Providers;

export function getProvider(name: ProviderKey): BaseProvider.Api {
  if (name in Providers) {
    return Providers[name];
  }
  throw new Error(`unknown provider ${name}`);
}

export function getAllProviders(): BaseProvider.Api[] {
  return Object.values(Providers);
}