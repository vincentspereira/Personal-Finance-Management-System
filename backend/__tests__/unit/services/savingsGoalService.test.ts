jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));

import * as savingsGoalService from '../../../src/services/savingsGoalService';
import { queryMock } from './../../unit/__mocks__/db';

const userId = 'test-user-id';

const mockGoal = {
  id: 'g1', name: 'Emergency Fund', target_amount: '10000', current_amount: '5000',
  target_date: '2026-12-31', color: '#3b82f6', is_completed: false,
};

describe('savingsGoalService', () => {
  beforeEach(() => queryMock.mockReset());

  describe('listSavingsGoals', () => {
    it('returns all goals for a user', async () => {
      queryMock.mockResolvedValue({ rows: [mockGoal] });
      const result = await savingsGoalService.listSavingsGoals(userId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Emergency Fund');
    });
  });

  describe('getSavingsGoal', () => {
    it('returns a single goal', async () => {
      queryMock.mockResolvedValue({ rows: [mockGoal] });
      const result = await savingsGoalService.getSavingsGoal('g1', userId);
      expect(result.id).toBe('g1');
    });

    it('returns null for non-existent goal', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await savingsGoalService.getSavingsGoal('missing', userId);
      expect(result).toBeNull();
    });
  });

  describe('createSavingsGoal', () => {
    it('creates a goal with all fields', async () => {
      queryMock.mockResolvedValue({ rows: [mockGoal] });
      const result = await savingsGoalService.createSavingsGoal(userId, {
        name: 'Emergency Fund', target_amount: 10000, current_amount: 5000, target_date: '2026-12-31', color: '#3b82f6',
      });
      expect(result).toEqual(mockGoal);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO savings_goals'),
        expect.arrayContaining([userId, 'Emergency Fund', 10000, 5000, '2026-12-31', '#3b82f6'])
      );
    });

    it('uses defaults for optional fields', async () => {
      queryMock.mockResolvedValue({ rows: [mockGoal] });
      await savingsGoalService.createSavingsGoal(userId, {
        name: 'Vacation', target_amount: 5000,
      });
      const params = queryMock.mock.calls[0][1];
      expect(params[4]).toBeNull(); // target_date defaults to null
      expect(params[5]).toBe('#3b82f6'); // color default
    });
  });

  describe('updateSavingsGoal', () => {
    it('updates provided fields', async () => {
      const updated = { ...mockGoal, current_amount: '7500' };
      queryMock.mockResolvedValue({ rows: [updated] });
      const result = await savingsGoalService.updateSavingsGoal('g1', userId, { current_amount: 7500 });
      expect(result.current_amount).toBe('7500');
    });

    it('returns null when no fields provided', async () => {
      const result = await savingsGoalService.updateSavingsGoal('g1', userId, {});
      expect(result).toBeNull();
    });

    it('marks goal as completed', async () => {
      const completed = { ...mockGoal, is_completed: true };
      queryMock.mockResolvedValue({ rows: [completed] });
      const result = await savingsGoalService.updateSavingsGoal('g1', userId, { is_completed: true });
      expect(result.is_completed).toBe(true);
    });
  });

  describe('deleteSavingsGoal', () => {
    it('deletes and returns id', async () => {
      queryMock.mockResolvedValue({ rows: [{ id: 'g1' }] });
      const result = await savingsGoalService.deleteSavingsGoal('g1', userId);
      expect(result.id).toBe('g1');
    });

    it('returns null for non-existent goal', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await savingsGoalService.deleteSavingsGoal('missing', userId);
      expect(result).toBeNull();
    });
  });
});
