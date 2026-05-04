jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));

import * as reportService from '../../../src/services/reportService';
import { queryMock } from './../../unit/__mocks__/db';

// Mock analyticsService to isolate reportService tests
jest.mock('../../../src/services/analyticsService', () => ({
  getSummary: jest.fn().mockResolvedValue({
    total_income: '5000', total_expense: '3000', net: '2000',
    savings_rate: 40, income_change: 10, expense_change: 5,
  }),
  getByCategory: jest.fn().mockResolvedValue([
    { id: 'c1', name: 'Groceries', type: 'expense', color: '#22c55e', total: '500', transaction_count: '10' },
  ]),
  getTrends: jest.fn().mockResolvedValue([
    { month: '2026-01', income: '5000', expense: '3000', net: '2000' },
  ]),
  getTopMerchants: jest.fn().mockResolvedValue([
    { merchant_name: 'Amazon', transaction_count: '5', total_spent: '500' },
  ]),
  getCashflow: jest.fn().mockResolvedValue([
    { date: '2026-01-01', income: '100', expense: '50', net: '50' },
  ]),
}));

const userId = 'test-user-id';

describe('reportService', () => {
  beforeEach(() => queryMock.mockReset());

  describe('getMonthlyReport', () => {
    it('returns full monthly report', async () => {
      const result = await reportService.getMonthlyReport(userId, 2026, 1);

      expect(result.period.year).toBe(2026);
      expect(result.period.month).toBe(1);
      expect(result.period.start).toBe('2026-01-01');
      expect(result.period.end).toBe('2026-01-31');
      expect(result.summary).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.merchants).toBeDefined();
      expect(result.cashflow).toBeDefined();
    });

    it('calculates correct end date for each month', async () => {
      const feb = await reportService.getMonthlyReport(userId, 2026, 2);
      expect(feb.period.end).toBe('2026-02-28');

      const jan = await reportService.getMonthlyReport(userId, 2026, 1);
      expect(jan.period.end).toBe('2026-01-31');
    });
  });

  describe('getAnnualReport', () => {
    it('returns annual summary with monthly breakdown', async () => {
      queryMock.mockResolvedValue({
        rows: [
          { month: '2026-01', income: '5000', expense: '3000', net: '2000', transaction_count: '25' },
          { month: '2026-02', income: '5500', expense: '3200', net: '2300', transaction_count: '30' },
        ],
      });

      const result = await reportService.getAnnualReport(userId, 2026);

      expect(result.period.year).toBe(2026);
      expect(result.period.start).toBe('2026-01-01');
      expect(result.period.end).toBe('2026-12-31');
      expect(result.monthly_breakdown).toHaveLength(2);
      expect(result.summary).toBeDefined();
      expect(result.categories).toBeDefined();
    });
  });

  describe('getCustomReport', () => {
    it('returns report for custom date range', async () => {
      const result = await reportService.getCustomReport(userId, '2026-01-15', '2026-03-15');

      expect(result.period.start).toBe('2026-01-15');
      expect(result.period.end).toBe('2026-03-15');
      expect(result.summary).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(result.merchants).toBeDefined();
      expect(result.cashflow).toBeDefined();
    });
  });

  describe('getNetWorth', () => {
    it('returns net worth with account balances', async () => {
      queryMock.mockResolvedValue({
        rows: [
          { id: 'acc-1', name: 'Checking', type: 'checking', opening_balance: '1000', transaction_balance: '250' },
          { id: 'acc-2', name: 'Savings', type: 'savings', opening_balance: '5000', transaction_balance: '1000' },
        ],
      });

      const result = await reportService.getNetWorth(userId);

      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].balance).toBe(1250); // 1000 + 250
      expect(result.accounts[1].balance).toBe(6000); // 5000 + 1000
      expect(result.total_net_worth).toBe(7250); // 1250 + 6000
    });

    it('handles negative balances', async () => {
      queryMock.mockResolvedValue({
        rows: [
          { id: 'acc-1', name: 'Credit', type: 'credit', opening_balance: '0', transaction_balance: '-500' },
        ],
      });

      const result = await reportService.getNetWorth(userId);
      expect(result.accounts[0].balance).toBe(-500);
      expect(result.total_net_worth).toBe(-500);
    });

    it('handles no accounts', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await reportService.getNetWorth(userId);
      expect(result.accounts).toEqual([]);
      expect(result.total_net_worth).toBe(0);
    });
  });
});
