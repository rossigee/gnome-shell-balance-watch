export const ERROR_MESSAGES = {
  PROVIDER_DISABLED: 'Provider temporarily disabled due to errors',
  AUTH_FAILED: 'Authentication failed - check your API key',
  RATE_LIMITED: 'Rate limit exceeded - try again later',
} as const;

export class ContextualError extends Error {
  originalError?: Error;

  constructor(message: string, context?: { provider?: string; url?: string }) {
    super(message);
    if (context) {
      this.message = [message, context.provider, context.url].filter(Boolean).join(' - ');
    }
  }
}

export function createContextualError(
  error: Error,
  context?: { provider?: string; url?: string },
): ContextualError {
  const contextual = new ContextualError(error.message, context);
  contextual.originalError = error;
  return contextual;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold = 5, timeoutMs = 300000) {
    this.threshold = threshold;
    this.timeout = timeoutMs;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  isOpen(): boolean {
    if (this.failures < this.threshold) {
      return false;
    }

    if (Date.now() - this.lastFailureTime > this.timeout) {
      this.failures = 0;
      return false;
    }

    return true;
  }
}