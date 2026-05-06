jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));
jest.mock('../../../src/services/transactionService');
jest.mock('../../../src/services/reportService');

import * as exportService from '../../../src/services/exportService';
import * as transactionService from '../../../src/services/transactionService';
import * as reportService from '../../../src/services/reportService';

const userId = 'test-user-id';

describe('exportService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('exportTransactionsCSV', () => {
    it('exports transactions as CSV with headers', async () => {
      (transactionService.exportTransactions as jest.Mock).mockResolvedValue([
        { transaction_date: '2026-01-15', type: 'expense', amount: '50.00', currency: 'USD', description: 'Groceries', merchant_name: 'Whole Foods', category_name: 'Food', account_name: 'Checking', tags: ['food'], source: 'manual' },
      ]);

      const csv = await exportService.exportTransactionsCSV(userId, {});
      expect(csv).toContain('Date,Type,Amount,Currency,Description,Merchant,Category,Account,Tags,Source');
      expect(csv).toContain('2026-01-15');
      expect(csv).toContain('Groceries');
      expect(csv).toContain('Whole Foods');
    });

    it('escapes CSV special characters', async () => {
      (transactionService.exportTransactions as jest.Mock).mockResolvedValue([
        { transaction_date: '2026-01-15', type: 'expense', amount: '10', currency: 'USD', description: 'Item, with "comma"', merchant_name: null, category_name: null, account_name: null, tags: [], source: 'manual' },
      ]);

      const csv = await exportService.exportTransactionsCSV(userId, {});
      expect(csv).toContain('"Item, with ""comma""');
    });

    it('handles empty transactions', async () => {
      (transactionService.exportTransactions as jest.Mock).mockResolvedValue([]);
      const csv = await exportService.exportTransactionsCSV(userId, {});
      expect(csv).toContain('Date,Type,Amount');
    });

    it('passes date filters', async () => {
      (transactionService.exportTransactions as jest.Mock).mockResolvedValue([]);
      await exportService.exportTransactionsCSV(userId, { startDate: '2026-01-01', endDate: '2026-01-31' });
      expect(transactionService.exportTransactions).toHaveBeenCalledWith(userId, { startDate: '2026-01-01', endDate: '2026-01-31' });
    });
  });

  describe('exportReportCSV', () => {
    const mockReport = {
      period: { start: '2026-01-01', end: '2026-01-31' },
      summary: { total_income: 5000, total_expense: 3000, net: 2000, savings_rate: 40 },
      categories: [
        { id: 'c1', name: 'Food', type: 'expense', total: '500', percentage: 16.7, count: 10 },
      ],
      merchants: [
        { merchant_name: 'Whole Foods', total: '200', count: 4 },
      ],
    };

    it('exports monthly report as CSV', async () => {
      (reportService.getMonthlyReport as jest.Mock).mockResolvedValue(mockReport);
      const csv = await exportService.exportReportCSV(userId, 'monthly', { year: 2026, month: 1 });
      expect(csv).toContain('SUMMARY');
      expect(csv).toContain('CATEGORY BREAKDOWN');
      expect(csv).toContain('Food');
    });

    it('exports annual report with monthly breakdown', async () => {
      (reportService.getAnnualReport as jest.Mock).mockResolvedValue({
        ...mockReport,
        monthly_breakdown: [
          { month: '2026-01', income: '5000', expense: '3000', net: '2000', transaction_count: 30 },
        ],
      });
      const csv = await exportService.exportReportCSV(userId, 'annual', { year: 2026 });
      expect(csv).toContain('MONTHLY BREAKDOWN');
      expect(csv).toContain('2026-01');
    });

    it('exports custom report', async () => {
      (reportService.getCustomReport as jest.Mock).mockResolvedValue(mockReport);
      const csv = await exportService.exportReportCSV(userId, 'custom', { startDate: '2026-01-01', endDate: '2026-06-30' });
      expect(csv).toContain('SUMMARY');
    });

    it('throws if missing dates for custom report', async () => {
      await expect(exportService.exportReportCSV(userId, 'custom', {})).rejects.toThrow();
    });
  });
});
