import { equal, notEqual } from 'assert';
import { format } from '../../src/format/Format';
import { BalanceData } from '../../src/types';

describe('Format', () => {
  it('should format balance with provider name', () => {
    const data: BalanceData = { available: 25.50, currency: 'USD' };
    const result = format(data, 'OpenAI', '{provider} {v} {cs}');
    equal(result, 'OpenAI 25.50 $');
  });

  it('should handle undefined data', () => {
    const result = format(undefined, 'OpenAI', '{provider} ...');
    equal(result, 'OpenAI ...');
  });

  it('should format small values with more decimals', () => {
    const data: BalanceData = { available: 0.1234, currency: 'USD' };
    const result = format(data, 'Test', '{v}');
    equal(result, '0.1234');
  });

  it('should format large values with commas', () => {
    const data: BalanceData = { available: 1234.56, currency: 'USD' };
    const result = format(data, 'Test', '{v}');
    equal(result, '1,234.56');
  });

  it('should handle credits currency', () => {
    const data: BalanceData = { available: 500, currency: 'credits' };
    const result = format(data, 'PPQ', '{v} {cs}');
    equal(result, '500.00 ');
  });

  it('should include raw value', () => {
    const data: BalanceData = { available: 99.99, currency: 'USD' };
    const result = format(data, 'Test', '{raw}');
    equal(result, 99.99);
  });

  it('should show currency code', () => {
    const data: BalanceData = { available: 50, currency: 'USD' };
    const result = format(data, 'Test', '{currency}');
    equal(result, 'USD');
  });

  it('should handle zero balance', () => {
    const data: BalanceData = { available: 0, currency: 'USD' };
    const result = format(data, 'Test', '{v}');
    equal(result, '0.00');
  });
});