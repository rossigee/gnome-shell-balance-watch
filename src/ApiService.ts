import { idleAdd, timeoutAdd, timeoutRemove } from './timeouts';
import * as Config from '@gnome-shell/misc/config';
import Gio from '@girs/gio-2.0';

import * as HTTP from './HTTP';
import { getProvider, BaseProvider, Providers, ProviderKey } from './providers';
import { Extension } from '@gnome-shell/extensions/extension';
import { ERROR_MESSAGES, createContextualError, CircuitBreaker } from './ApiServiceUtils';
import { AccountOptions, BalanceData } from './types';

export interface Subscriber {
  accountId: string;
  options: AccountOptions;
  apiKey: string;

  onUpdateStart(): void;
  onUpdateError(err: Error): void;
  onUpdateBalance(data: BalanceData): void;
}

export { CircuitBreaker, ERROR_MESSAGES, createContextualError } from './ApiServiceUtils';

const permanentErrors: Map<ProviderKey, Error> = new Map();
const permanentErrorTimeouts: Map<ProviderKey, number> = new Map();
const circuitBreakers: Map<ProviderKey, CircuitBreaker> = new Map();

export const PERMANENT_ERROR_TIMEOUT = 60 * 60 * 1000;

function getCircuitBreaker(provider: ProviderKey): CircuitBreaker {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, new CircuitBreaker());
  }
  return circuitBreakers.get(provider)!;
}

function setPermanentError(provider: ProviderKey, error: Error) {
  permanentErrors.set(provider, error);

  const existingTimeout = permanentErrorTimeouts.get(provider);
  if (existingTimeout) {
    timeoutRemove(existingTimeout);
  }

  const timeoutId = timeoutAdd(PERMANENT_ERROR_TIMEOUT, () => {
    permanentErrors.delete(provider);
    permanentErrorTimeouts.delete(provider);
    console.log(`Cleared permanent error for provider ${provider} after timeout`);
  });

  permanentErrorTimeouts.set(provider, timeoutId);
}

const applySubscribers = (subscribers: Subscriber[], func: (s: Subscriber) => void) =>
  subscribers.forEach((s) => {
    try {
      func(s);
    } catch (e: any) {
      try {
        s.onUpdateError(e);
        console.log(e);
      } catch (e) {
        console.log(e);
      }
    }
  });

interface CacheEntry {
  date: Date;
  data: BalanceData;
}

class PollLoop {
  private provider: BaseProvider.Api;
  private providerKey: ProviderKey;
  private interval: number;
  private cache = new Map<string, CacheEntry>();
  private signal: number | null = null;
  private subscribers: Subscriber[] = [];
  private accountIds: string[] = [];
  private _cancellable: Gio.Cancellable | null = null;
  private retryTimeouts = new Map<number, () => void>();

  constructor(provider: BaseProvider.Api, providerKey: ProviderKey) {
    this.interval = Number(provider.interval);
    if (isNaN(this.interval) || this.interval < 30) {
      this.interval = 300;
    }
    this.provider = provider;
    this.providerKey = providerKey;
  }

  start(): boolean {
    if (this.signal === null) {
      this._cancellable = new Gio.Cancellable();
      this.signal = idleAdd(() => {
        this.run();
      });
      return true;
    }
    return false;
  }

  stop() {
    if (this.signal !== null) {
      timeoutRemove(this.signal);
      this.signal = null;
    }
    this._cancellable?.cancel();
    this._cancellable = null;
    this.retryTimeouts.forEach((resolve, sourceId) => {
      timeoutRemove(sourceId);
      resolve();
    });
    this.retryTimeouts.clear();
  }

  destroy() {
    this.stop();
    this.cache.clear();
    this.subscribers = [];
    this.accountIds = [];
  }

  private waitForRetry(delay: number): Promise<void> {
    return new Promise((resolve) => {
      const sourceId = timeoutAdd(delay, () => {
        this.retryTimeouts.delete(sourceId);
        resolve();
      });
      this.retryTimeouts.set(sourceId, () => {
        this.retryTimeouts.delete(sourceId);
        resolve();
      });
    });
  }

  run() {
    try {
      this.update();
    } catch (e) {
      console.error(e);
    }

    if (this._cancellable === null) {
      return;
    }

    this.signal = timeoutAdd(this.interval * 1000, this.run.bind(this));
  }

  setSubscribers(subscribers: Subscriber[]) {
    this.subscribers = subscribers.filter(
      (s) => getProvider(s.options.provider as ProviderKey) === this.provider,
    );

    if (this.subscribers.length === 0) {
      this.cache.clear();
      return this.stop();
    }

    this.accountIds = [...new Set(this.subscribers.map((s) => s.accountId))];

    if (this.start()) {
      return;
    }

    this.accountIds.forEach((accountId) => this.updateAccount(accountId, this.cache.get(accountId)));
  }

  async updateAccount(accountId: string, cache?: CacheEntry) {
    const accountSubscribers = this.subscribers.filter((s) => s.accountId === accountId);
    if (accountSubscribers.length === 0) return;

    const subscriber = accountSubscribers[0];
    const { options, apiKey } = subscriber;

    if (cache) {
      applySubscribers(accountSubscribers, (s) => s.onUpdateBalance(cache.data));
      return;
    }

    applySubscribers(accountSubscribers, (s) => s.onUpdateStart());

    const error = permanentErrors.get(this.providerKey);
    if (error) {
      applySubscribers(accountSubscribers, (s) => s.onUpdateError(error));
      return;
    }

    const circuitBreaker = getCircuitBreaker(this.providerKey);
    if (circuitBreaker.isOpen()) {
      const circuitError = new Error(ERROR_MESSAGES.PROVIDER_DISABLED);
      applySubscribers(accountSubscribers, (s) => s.onUpdateError(circuitError));
      return;
    }

    const ext = Extension.lookupByURL(import.meta.url);
    if (!ext) {
      throw new Error('Unable to find extension');
    }

    const maxRetries = 3;
    const baseDelay = 1000;

    const url = this.provider.getUrl(options, apiKey);
    const method = this.provider.getMethod();
    const headers = this.provider.getHeaders(apiKey);
    const body = this.provider.getBody(apiKey, options as BaseProvider.Options);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let response: unknown;

        if (method === 'POST' && body) {
          response = await HTTP.postJSON(url, {
            userAgent: HTTP.getDefaultUserAgent(ext.metadata, Config.PACKAGE_VERSION),
            headers,
            body,
            cancellable: this._cancellable,
          });
        } else {
          response = await HTTP.getJSON(url, {
            userAgent: HTTP.getDefaultUserAgent(ext.metadata, Config.PACKAGE_VERSION),
            headers,
            cancellable: this._cancellable,
          });
        }

        const balanceData = this.provider.parseData(response);
        this.cache.set(accountId, { date: new Date(), data: balanceData });
        circuitBreaker.recordSuccess();
        applySubscribers(accountSubscribers, (s) => s.onUpdateBalance(balanceData));
        return;
      } catch (err: any) {
        if (this._cancellable === null) {
          return;
        }

        const isLastAttempt = attempt === maxRetries - 1;

        if (HTTP.isErrTooManyRequests(err)) {
          setPermanentError(this.providerKey, err);
          console.error(err);
          this.cache.delete(accountId);
          applySubscribers(accountSubscribers, (s) => s.onUpdateError(err));
          return;
        }

        if (HTTP.isErrUnauthorized(err)) {
          const authError = new Error(ERROR_MESSAGES.AUTH_FAILED);
          circuitBreaker.recordFailure();
          applySubscribers(accountSubscribers, (s) => s.onUpdateError(authError));
          return;
        }

        if (!isLastAttempt) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await this.waitForRetry(delay);
          if (this._cancellable === null) {
            return;
          }
        } else {
          circuitBreaker.recordFailure();
          const contextualError = createContextualError(err, {
            provider: this.providerKey,
            url,
          });
          console.error(contextualError);
          this.cache.delete(accountId);
          applySubscribers(accountSubscribers, (s) => s.onUpdateError(contextualError));
        }
      }
    }
  }

  update() {
    const lastUpdate = (accountId: string) =>
      this.cache.has(accountId) ? this.cache.get(accountId)!.date : undefined;

    const updateAccounts = this.accountIds.filter((id) => lastUpdate(id) === undefined);

    const oldestAccount = this.accountIds
      .filter((id) => lastUpdate(id) !== undefined)
      .sort((a, b) => lastUpdate(a)!.getTime() - lastUpdate(b)!.getTime())[0];

    if (oldestAccount) {
      updateAccounts.push(oldestAccount);
    }

    updateAccounts.forEach((accountId) => this.updateAccount(accountId));
  }
}

const _pollLoops = new Map(
  Object.entries(Providers).map(([key, provider]) => [key, new PollLoop(provider, key as ProviderKey)]),
);

export function setSubscribers(subscribers: Subscriber[]) {
  _pollLoops.forEach((loop) => loop.setSubscribers(subscribers));
}

export function hasPermanentError(provider: ProviderKey): boolean {
  return permanentErrors.has(provider);
}

export function clearPermanentError(provider: ProviderKey): void {
  const cleared = permanentErrors.delete(provider);
  const timeoutId = permanentErrorTimeouts.get(provider);
  if (timeoutId) {
    timeoutRemove(timeoutId);
    permanentErrorTimeouts.delete(provider);
  }
  if (cleared) {
    console.log(`Manually cleared permanent error for provider ${provider}`);
  }
}

export function destroy() {
  _pollLoops.forEach((loop) => loop.destroy());

  permanentErrorTimeouts.forEach((sourceId) => {
    timeoutRemove(sourceId);
  });
  permanentErrorTimeouts.clear();
  permanentErrors.clear();
  circuitBreakers.clear();
}