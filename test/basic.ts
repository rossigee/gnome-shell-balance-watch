import { equal } from 'assert';

describe('Basic Tests', () => {
  it('should pass basic assertion', () => {
    equal(1 + 1, 2);
  });

  it('should handle string formatting', () => {
    const template = '{provider} {v} {cs}';
    const data = { provider: 'OpenAI', v: '25.50', cs: '$' };
    const result = template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? ''));
    equal(result, 'OpenAI 25.50 $');
  });
});