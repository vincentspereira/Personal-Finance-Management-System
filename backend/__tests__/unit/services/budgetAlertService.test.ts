jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));

import * as budgetAlertService from '../../../src/services/budgetAlertService';
import { queryMock } from './../../unit/__mocks__/db';

const userId = 'test-user-id';

describe('budgetAlertService', () => {
  beforeEach(() => queryMock.mockReset());

  describe('getBudgetAlerts', () => {
    it('returns empty array when no budgets', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await budgetAlertService.getBudgetAlerts(userId);
      expect(result).toEqual([]);
    });

    it('returns warning alert when spending >= 80%', async () => {
      queryMock.mockResolvedValue({
        rows: [{
          budget_id: 'b1',
          category_name: 'Food',
          budget_amount: '500',
          actual_spent: '420',
        }],
      });
      const result = await budgetAlertService.getBudgetAlerts(userId);
      expect(result).toHaveLength(1);
      expect(result[0].alert_type).toBe('warning');
      expect(result[0].category_name).toBe('Food');
      expect(result[0].percentage).toBeGreaterThanOrEqual(80);
    });

    it('returns exceeded alert when spending >= 100%', async () => {
      queryMock.mockResolvedValue({
        rows: [{
          budget_id: 'b2',
          category_name: 'Entertainment',
          budget_amount: '200',
          actual_spent: '250',
        }],
      });
      const result = await budgetAlertService.getBudgetAlerts(userId);
      expect(result).toHaveLength(1);
      expect(result[0].alert_type).toBe('exceeded');
      expect(result[0].budget_amount).toBe(200);
      expect(result[0].actual_spent).toBe(250);
    });

    it('does not return alert when spending < 80%', async () => {
      queryMock.mockResolvedValue({
        rows: [{
          budget_id: 'b3',
          category_name: 'Transport',
          budget_amount: '300',
          actual_spent: '100',
        }],
      });
      const result = await budgetAlertService.getBudgetAlerts(userId);
      expect(result).toHaveLength(0);
    });

    it('sorts alerts by percentage descending', async () => {
      queryMock.mockResolvedValue({
        rows: [
          { budget_id: 'b1', category_name: 'Food', budget_amount: '500', actual_spent: '420' },
          { budget_id: 'b2', category_name: 'Rent', budget_amount: '1000', actual_spent: '1050' },
        ],
      });
      const result = await budgetAlertService.getBudgetAlerts(userId);
      expect(result[0].percentage).toBeGreaterThanOrEqual(result[1].percentage);
    });

    it('calculates daily budget remaining', async () => {
      queryMock.mockResolvedValue({
        rows: [{
          budget_id: 'b1',
          category_name: 'Food',
          budget_amount: '300',
          actual_spent: '260',
        }],
      });
      const result = await budgetAlertService.getBudgetAlerts(userId);
      expect(result[0].daily_budget_remaining).toBeGreaterThanOrEqual(0);
      expect(result[0].remaining_days).toBeGreaterThan(0);
    });
  });
});
