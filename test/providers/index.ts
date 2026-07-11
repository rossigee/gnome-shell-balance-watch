import { deepEqual, equal, ok } from 'assert';
import { Api as OpenAIProvider } from '../src/providers/ProviderOpenAI';
import { Api as AnthropicProvider } from '../src/providers/ProviderAnthropic';
import { Api as GroqProvider } from '../src/providers/ProviderGroq';
import { Api as OpenRouterProvider } from '../src/providers/ProviderOpenRouter';
import { Api as OpenCodeZenProvider } from '../src/providers/ProviderOpenCodeZen';
import { Api as PPQProvider } from '../src/providers/ProviderPPQ';
import { Api as XAIProvider } from '../src/providers/ProviderXAI';

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
          line_items: [
            { cost: 5000 },
            { cost: 3000 },
          ],
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

  it('should include x-api-key header', () => {
    const headers = provider.getHeaders('sk-ant-test');
    ok(headers['x-api-key'] === 'sk-ant-test');
    ok(headers['anthropic-version'] === '2023-06-01');
  });

  it('should parse costs array correctly', () => {
    const data = {
      costs: [
        { amount: 25.50, currency: 'usd' },
      ],
    };
    const result = provider.parseData(data);
    equal(result.used, 25.50);
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

  it('should build correct URL', () => {
    const url = provider.getUrl({}, 'gsk_test');
    equal(url, 'https://api.groq.com/v1/usage');
  });

  it('should parse total_usage correctly', () => {
    const data = { total_usage: 8000 };
    const result = provider.parseData(data);
    equal(result.used, 80);
    equal(result.currency, 'USD');
  });
});

describe('ProviderOpenRouter', () => {
  const provider = new OpenRouterProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'OpenRouter');
  });

  it('should build correct URL', () => {
    const url = provider.getUrl({}, 'sk-or-test');
    equal(url, 'https://openrouter.ai/api/v1/credits');
  });

  it('should parse balance data correctly', () => {
    const data = {
      data: {
        balance: 45.67,
        total_usage: 12.33,
      },
    };
    const result = provider.parseData(data);
    equal(result.available, 45.67);
    equal(result.used, 12.33);
    equal(result.currency, 'USD');
  });

  it('should handle missing balance', () => {
    const data = { data: {} };
    const result = provider.parseData(data);
    equal(result.available, 0);
  });
});

describe('ProviderOpenCodeZen', () => {
  const provider = new OpenCodeZenProvider();

  it('should have correct apiName', () => {
    equal(provider.apiName, 'OpenCode Zen');
  });

  it('should build correct URL', () => {
    const url = provider.getUrl({}, 'sk-zen-test');
    equal(url, 'https://opencode.ai/zen/v1/balance');
  });

  it('should parse balance data correctly', () => {
    const data = { balance: 99.99, currency: 'USD' };
    const result = provider.parseData(data);
    equal(result.available, 99.99);
    equal(result.currency, 'USD');
  });

  it('should default to USD currency', () => {
    const data = { balance: 50 };
    const result = provider.parseData(data);
    equal(result.currency, 'USD');
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

  it('should build correct URL', () => {
    const url = provider.getUrl({}, 'sk-ppq-test');
    equal(url, 'https://api.ppq.ai/credits/balance');
  });

  it('should generate body with credit_id', () => {
    const body = provider.getBody('sk-ppq-test', {
      extraParams: { credit_id: 'test-credit-id' },
    });
    const parsed = JSON.parse(body!);
    equal(parsed.credit_id, 'test-credit-id');
  });

  it('should throw error if credit_id missing', () => {
    let error: Error | null = null;
    try {
      provider.getBody('sk-ppq-test', { extraParams: {} });
    } catch (e) {
      error = e as Error;
    }
    ok(error !== null);
    equal(error!.message, 'credit_id is required for PPQ.AI');
  });

  it('should parse balance correctly', () => {
    const data = { balance: 1234.56 };
    const result = provider.parseData(data);
    equal(result.available, 1234.56);
    equal(result.currency, 'credits');
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

  it('should handle positive values', () => {
    const data = { total: { val: '1000' } };
    const result = provider.parseData(data);
    equal(result.available, 10);
  });

  it('should handle missing total', () => {
    const data = {};
    const result = provider.parseData(data);
    equal(result.available, 0);
  });
});