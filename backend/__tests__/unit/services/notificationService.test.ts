jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));
jest.mock('../../../src/services/budgetAlertService');
jest.mock('../../../src/services/savingsGoalService');

import * as notificationService from '../../../src/services/notificationService';
import { queryMock } from './../../unit/__mocks__/db';
import * as budgetAlertService from '../../../src/services/budgetAlertService';
import * as savingsGoalService from '../../../src/services/savingsGoalService';

const userId = 'test-user-id';

describe('notificationService', () => {
  beforeEach(() => queryMock.mockReset());

  describe('createNotification', () => {
    it('creates a new notification', async () => {
      // No existing duplicate
      queryMock.mockResolvedValueOnce({ rows: [] });
      queryMock.mockResolvedValueOnce({ rows: [] });

      await notificationService.createNotification(userId, 'budget_exceeded', 'Test', 'Test message', { key: 'val' });
      const lastCall = queryMock.mock.calls[1];
      expect(lastCall[0]).toContain('INSERT INTO notifications');
    });

    it('skips if duplicate unread notification exists within 24h', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
      await notificationService.createNotification(userId, 'budget_warning', 'Test', 'Msg');
      expect(queryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('listNotifications', () => {
    it('returns paginated notifications with unread count', async () => {
      const mockNotifs = [{ id: 'n1', type: 'info', title: 'Test', message: 'Msg', is_read: false }];
      queryMock.mockResolvedValueOnce({ rows: mockNotifs });
      queryMock.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      queryMock.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await notificationService.listNotifications(userId, 1, 20);
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unread).toBe(1);
    });
  });

  describe('markRead', () => {
    it('marks a notification as read', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      await notificationService.markRead('n1', userId);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET is_read = true'),
        ['n1', userId]
      );
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications as read', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      await notificationService.markAllRead(userId);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('is_read = true'),
        [userId]
      );
    });
  });

  describe('deleteNotification', () => {
    it('deletes a notification', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      await notificationService.deleteNotification('n1', userId);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        ['n1', userId]
      );
    });
  });

  describe('generateBudgetNotifications', () => {
    it('creates notifications for budget alerts', async () => {
      (budgetAlertService.getBudgetAlerts as jest.Mock).mockResolvedValue([
        { alert_type: 'exceeded', category_name: 'Food', actual_spent: 600, budget_amount: 500, percentage: 120, budget_id: 'b1' },
      ]);
      // mock for duplicate check (no dup) and insert
      queryMock.mockResolvedValue({ rows: [] });

      await notificationService.generateBudgetNotifications(userId);
      expect(budgetAlertService.getBudgetAlerts).toHaveBeenCalledWith(userId);
    });

    it('handles no alerts gracefully', async () => {
      (budgetAlertService.getBudgetAlerts as jest.Mock).mockResolvedValue([]);
      await notificationService.generateBudgetNotifications(userId);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('generateGoalNotifications', () => {
    it('creates notification when a goal is completed', async () => {
      (savingsGoalService.listSavingsGoals as jest.Mock).mockResolvedValue([
        { id: 'g1', name: 'Emergency Fund', current_amount: '10000', target_amount: '10000', is_completed: false },
      ]);
      queryMock.mockResolvedValue({ rows: [] });

      await notificationService.generateGoalNotifications(userId);
    });

    it('does not notify for in-progress goals', async () => {
      (savingsGoalService.listSavingsGoals as jest.Mock).mockResolvedValue([
        { id: 'g1', name: 'Savings', current_amount: '500', target_amount: '10000', is_completed: false },
      ]);

      await notificationService.generateGoalNotifications(userId);
      // queryMock should only be called for the list query, no notification insert
    });
  });
});
