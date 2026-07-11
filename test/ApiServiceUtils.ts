import { equal, ok } from 'assert';
import {
  CircuitBreaker,
  createContextualError,
  ERROR_MESSAGES,
  ContextualError,
} from '../src/ApiServiceUtils';

describe('CircuitBreaker', () => {
  it('should start in closed state', () => {
    const cb = new CircuitBreaker(3, 60000);
    equal(cb.isOpen(), false);
  });

  it('should record failures', () => {
    const cb = new CircuitBreaker(3, 60000);
    cb.recordFailure();
    cb.recordFailure();
    equal(cb.isOpen(), false);
  });

  it('should open after threshold failures', () => {
    const cb = new CircuitBreaker(3, 60000);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    equal(cb.isOpen(), true);
  });

  it('should reset failures on success', () => {
    const cb = new CircuitBreaker(3, 60000);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    cb.recordFailure();
    equal(cb.isOpen(), false);
  });

  it('should reset after timeout', async () => {
    const cb = new CircuitBreaker(1, 100);
    cb.recordFailure();
    equal(cb.isOpen(), true);
    await new Promise((r) => setTimeout(r, 150));
    equal(cb.isOpen(), false);
  });
});

describe('createContextualError', () => {
  it('should create error with message', () => {
    const original = new Error('Original error');
    const contextual = createContextualError(original, {});
    equal(contextual.message, 'Original error');
    equal(contextual.originalError, original);
  });

  it('should add provider context', () => {
    const original = new Error('API failed');
    const contextual = createContextualError(original, { provider: 'openai' });
    equal(contextual.message, 'API failed - openai');
  });

  it('should add url context', () => {
    const original = new Error('404');
    const contextual = createContextualError(original, {
      provider: 'openai',
      url: 'https://api.openai.com/v1/usage',
    });
    equal(contextual.message, '404 - openai - https://api.openai.com/v1/usage');
  });
});

describe('ERROR_MESSAGES', () => {
  it('should have all required error messages', () => {
    ok(ERROR_MESSAGES.PROVIDER_DISABLED);
    ok(ERROR_MESSAGES.AUTH_FAILED);
    ok(ERROR_MESSAGES.RATE_LIMITED);
  });

  it('should have string values', () => {
    equal(typeof ERROR_MESSAGES.PROVIDER_DISABLED, 'string');
    equal(typeof ERROR_MESSAGES.AUTH_FAILED, 'string');
    equal(typeof ERROR_MESSAGES.RATE_LIMITED, 'string');
  });
});