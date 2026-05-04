import { formatCurrency, calculatePercentageChange, getDateRange } from '../../../src/utils/formatters';

describe('formatCurrency', () => {
  it('formats USD amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-500.5)).toBe('-$500.50');
  });

  it('formats large numbers', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('respects currency parameter', () => {
    const result = formatCurrency(100, 'EUR');
    expect(result).toContain('100.00');
  });
});

describe('calculatePercentageChange', () => {
  it('calculates positive change', () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it('calculates negative change', () => {
    expect(calculatePercentageChange(50, 100)).toBe(-50);
  });

  it('returns 100 when previous is 0 and current is positive', () => {
    expect(calculatePercentageChange(50, 0)).toBe(100);
  });

  it('returns 0 when both are 0', () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });

  it('handles small changes precisely', () => {
    expect(calculatePercentageChange(101, 100)).toBe(1);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculatePercentageChange(333, 1000);
    expect(result).toBe(-66.7);
  });
});

describe('getDateRange', () => {
  it('returns "this_month" range starting on the 1st', () => {
    const { start, end } = getDateRange('this_month');
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
  });

  it('returns "last_month" range', () => {
    const { start, end } = getDateRange('last_month');
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBeLessThanOrEqual(31);
  });

  it('returns "ytd" range starting Jan 1', () => {
    const { start, end } = getDateRange('ytd');
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
  });

  it('returns "last_3m" range', () => {
    const { start, end } = getDateRange('last_3m');
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    expect(monthsDiff).toBeGreaterThanOrEqual(2);
  });

  it('defaults to last 1 month for unknown period', () => {
    const { start, end } = getDateRange('unknown_period');
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(start < end).toBe(true);
  });
});
