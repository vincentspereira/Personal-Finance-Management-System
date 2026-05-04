import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  IncomeExpenseBarChart,
  ExpenseDonutChart,
  CashflowAreaChart,
  TrendLineChart,
  TopMerchantsBarChart,
} from '../../src/components/Charts';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockTrends = [
  { month: '2026-01', income: 5000, expense: 3000 },
  { month: '2026-02', income: 5500, expense: 3200 },
  { month: '2026-03', income: 4800, expense: 2800 },
];

const mockCategories = [
  { name: 'Groceries', total: 500 },
  { name: 'Dining', total: 300 },
  { name: 'Transport', total: 200 },
];

const mockCashflow = [
  { date: 'Jan 1', income: 1000, expense: 200 },
  { date: 'Jan 2', income: 0, expense: 150 },
];

const mockMerchants = [
  { merchant_name: 'Amazon', total_spent: 500 },
  { merchant_name: 'Walmart', total_spent: 300 },
];

describe('Charts', () => {
  it('IncomeExpenseBarChart renders without errors', () => {
    const { container } = render(<IncomeExpenseBarChart data={mockTrends} />);
    expect(container).toBeTruthy();
  });

  it('IncomeExpenseBarChart handles empty data', () => {
    const { container } = render(<IncomeExpenseBarChart data={[]} />);
    expect(container).toBeTruthy();
  });

  it('ExpenseDonutChart renders pie chart', () => {
    const { container } = render(<ExpenseDonutChart data={mockCategories} />);
    expect(container).toBeTruthy();
  });

  it('ExpenseDonutChart handles empty data', () => {
    const { container } = render(<ExpenseDonutChart data={[]} />);
    expect(container).toBeTruthy();
  });

  it('CashflowAreaChart renders area chart', () => {
    const { container } = render(<CashflowAreaChart data={mockCashflow} />);
    expect(container).toBeTruthy();
  });

  it('TrendLineChart renders with default lines', () => {
    const { container } = render(<TrendLineChart data={mockTrends} />);
    expect(container).toBeTruthy();
  });

  it('TrendLineChart renders with custom lines config', () => {
    const lines = [
      { key: 'income', color: '#22c55e', name: 'Income' },
      { key: 'expense', color: '#ef4444', name: 'Expenses' },
    ];
    const { container } = render(<TrendLineChart data={mockTrends} lines={lines} />);
    expect(container).toBeTruthy();
  });

  it('TopMerchantsBarChart renders horizontal bars', () => {
    const { container } = render(<TopMerchantsBarChart data={mockMerchants} />);
    expect(container).toBeTruthy();
  });

  it('TopMerchantsBarChart handles empty data', () => {
    const { container } = render(<TopMerchantsBarChart data={[]} />);
    expect(container).toBeTruthy();
  });
});
