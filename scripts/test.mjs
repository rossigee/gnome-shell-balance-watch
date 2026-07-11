#!/usr/bin/env node
import { deepEqual, equal, ok } from 'assert';

// Simple test runner
const tests = [];

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    tests.push({ name, passed: true });
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    tests.push({ name, passed: false, error: e.message });
  }
}

function asyncIt(name, fn) {
  return fn().then(
    () => {
      console.log(`  ✓ ${name}`);
      tests.push({ name, passed: true });
    },
    (e) => {
      console.log(`  ✗ ${name}`);
      console.log(`    ${e.message}`);
      tests.push({ name, passed: false, error: e.message });
    },
  );
}

// Import and run tests
import { Api as OpenAIProvider } from '../src/providers/ProviderOpenAI.ts';
import { Api as AnthropicProvider } from '../src/providers/ProviderAnthropic.ts';
import { Api as GroqProvider } from '../src/providers/ProviderGroq.ts';
import { Api as OpenRouterProvider } from '../src/providers/ProviderOpenRouter.ts';
import { Api as OpenCodeZenProvider } from '../src/providers/ProviderOpenCodeZen.ts';
import { Api as PPQProvider } from '../src/providers/ProviderPPQ.ts';
import { Api as XAIProvider } from '../src/providers/ProviderXAI.ts';
import * as FormatModule from '../src/format/Format.ts';

describe('ProviderOpenAI', () => {
  const provider = new OpenAIProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'OpenAI');
  });

  it('should have correct interval', () => {
    equal(provider.interval, 300);
  });

  it('should build correct URL', () => {
    const url = provider.getUrl({}, 'sk-test');
    equal(url, 'https://api.openai.com/v1/usage');
  });

  it('should include Bearer authorization header', () => {
    const headers = provider.getHeaders('sk-test');
    deepEqual(headers, { Authorization: 'Bearer sk-test' });
  });

  it('should parse total_usage correctly', () => {
    const data = { total_usage: 15000 };
    const result = provider.parseData(data);
    equal(result.used, 150);
    equal(result.currency, 'USD');
  });

  it('should parse line_items data correctly', () => {
    const data = {
      data: [
        {
          line_items: [{ cost: 5000 }, { cost: 3000 }],
        },
      ],
    };
    const result = provider.parseData(data);
    equal(result.used, 80);
  });

  it('should handle missing data gracefully', () => {
    const data = {};
    const result = provider.parseData(data);
    equal(result.used, 0);
  });
});

describe('ProviderAnthropic', () => {
  const provider = new AnthropicProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'Anthropic');
  });

  it('should build correct URL', () => {
    const url = provider.getUrl({}, 'sk-ant-test');
    equal(url, 'https://api.anthropic.com/v1/organizations/me/usage');
  });

  it('should parse costs array correctly', () => {
    const data = { costs: [{ amount: 25.5, currency: 'usd' }] };
    const result = provider.parseData(data);
    equal(result.used, 25.5);
    equal(result.currency, 'USD');
  });

  it('should handle empty costs array', () => {
    const data = { costs: [] };
    const result = provider.parseData(data);
    equal(result.available, 0);
  });
});

describe('ProviderGroq', () => {
  const provider = new GroqProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'Groq');
  });

  it('should parse total_usage correctly', () => {
    const data = { total_usage: 8000 };
    const result = provider.parseData(data);
    equal(result.used, 80);
  });
});

describe('ProviderOpenRouter', () => {
  const provider = new OpenRouterProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'OpenRouter');
  });

  it('should parse balance data correctly', () => {
    const data = { data: { balance: 45.67, total_usage: 12.33 } };
    const result = provider.parseData(data);
    equal(result.available, 45.67);
    equal(result.used, 12.33);
  });
});

describe('ProviderOpenCodeZen', () => {
  const provider = new OpenCodeZenProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'OpenCode Zen');
  });

  it('should parse balance data correctly', () => {
    const data = { balance: 99.99, currency: 'USD' };
    const result = provider.parseData(data);
    equal(result.available, 99.99);
  });
});

describe('ProviderPPQ', () => {
  const provider = new PPQProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'PPQ.AI');
  });

  it('should use POST method', () => {
    equal(provider.getMethod(), 'POST');
  });

  it('should generate body with credit_id', () => {
    const body = provider.getBody('sk-ppq-test', {
      extraParams: { credit_id: 'test-credit-id' },
    });
    const parsed = JSON.parse(body);
    equal(parsed.credit_id, 'test-credit-id');
  });

  it('should throw error if credit_id missing', () => {
    let error = null;
    try {
      provider.getBody('sk-ppq-test', { extraParams: {} });
    } catch (e) {
      error = e;
    }
    ok(error !== null);
    equal(error.message, 'credit_id is required for PPQ.AI');
  });
});

describe('ProviderXAI', () => {
  const provider = new XAIProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'xAI');
  });

  it('should build URL with team_id', () => {
    const url = provider.getUrl({ extraParams: { team_id: 'team-123' } }, 'xai-test');
    equal(url, 'https://management-api.x.ai/v1/billing/teams/team-123/prepaid/balance');
  });

  it('should default to "me" for team_id', () => {
    const url = provider.getUrl({}, 'xai-test');
    equal(url, 'https://management-api.x.ai/v1/billing/teams/me/prepaid/balance');
  });

  it('should parse balance from total.val (cents)', () => {
    const data = { total: { val: '-2500' } };
    const result = provider.parseData(data);
    equal(result.available, 25);
  });
});

describe('Format', () => {
  const { format } = FormatModule;

  it('should format balance with provider name', () => {
    const data = { available: 25.5, currency: 'USD' };
    const result = format(data, 'OpenAI', '{provider} {v} {cs}');
    equal(result, 'OpenAI 25.50 $');
  });

  it('should handle undefined data', () => {
    const result = format(undefined, 'OpenAI', '{provider} ...');
    equal(result, 'OpenAI ...');
  });

  it('should handle zero balance', () => {
    const data = { available: 0, currency: 'USD' };
    const result = format(data, 'Test', '{v}');
    equal(result, '0.00');
  });
});

// Summary
const passed = tests.filter((t) => t.passed).length;
const failed = tests.filter((t) => !t.passed).length;
console.log(`\n\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);