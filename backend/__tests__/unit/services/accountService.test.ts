jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));

import * as accountService from '../../../src/services/accountService';
import { queryMock } from './../../unit/__mocks__/db';

const mockAccount = {
  id: 'acc-1', name: 'Main Checking', type: 'checking', currency: 'USD',
  opening_balance: '1000.00', is_archived: false, current_balance: '1250.00',
};

const userId = 'test-user-id';

describe('accountService', () => {
  beforeEach(() => queryMock.mockReset());

  describe('listAccounts', () => {
    it('returns accounts with computed balances', async () => {
      queryMock.mockResolvedValue({ rows: [mockAccount] });
      const result = await accountService.listAccounts(userId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Main Checking');
    });

    it('returns empty array when no accounts', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await accountService.listAccounts(userId);
      expect(result).toEqual([]);
    });
  });

  describe('getAccount', () => {
    it('returns a single account with balance', async () => {
      queryMock.mockResolvedValue({ rows: [mockAccount] });
      const result = await accountService.getAccount('acc-1', userId);
      expect(result.id).toBe('acc-1');
    });

    it('returns null for non-existent account', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await accountService.getAccount('missing', userId);
      expect(result).toBeNull();
    });
  });

  describe('createAccount', () => {
    it('creates an account with all fields', async () => {
      queryMock.mockResolvedValue({ rows: [mockAccount] });
      const result = await accountService.createAccount(userId, {
        name: 'Savings', type: 'savings', currency: 'USD', opening_balance: 5000,
      });
      expect(result).toEqual(mockAccount);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO accounts'),
        [userId, 'Savings', 'savings', 'USD', 5000]
      );
    });

    it('uses defaults for currency and opening_balance', async () => {
      queryMock.mockResolvedValue({ rows: [mockAccount] });
      await accountService.createAccount(userId, { name: 'Cash', type: 'cash' });
      const params = queryMock.mock.calls[0][1];
      expect(params[0]).toBe(userId);
      expect(params[3]).toBe('USD');
      expect(params[4]).toBe(0);
    });
  });

  describe('updateAccount', () => {
    it('updates provided fields', async () => {
      const updated = { ...mockAccount, name: 'Renamed' };
      queryMock.mockResolvedValue({ rows: [updated] });

      const result = await accountService.updateAccount('acc-1', userId, { name: 'Renamed' });
      expect(result.name).toBe('Renamed');
      const sql = queryMock.mock.calls[0][0];
      expect(sql).toContain('name = $1');
      expect(sql).toContain('updated_at = NOW()');
    });

    it('returns null when no fields to update', async () => {
      const result = await accountService.updateAccount('acc-1', userId, {});
      expect(result).toBeNull();
    });

    it('updates multiple fields', async () => {
      queryMock.mockResolvedValue({ rows: [mockAccount] });
      await accountService.updateAccount('acc-1', userId, { name: 'New', currency: 'EUR' });
      const sql = queryMock.mock.calls[0][0];
      expect(sql).toContain('name = $1');
      expect(sql).toContain('currency = $2');
    });
  });

  describe('archiveAccount', () => {
    it('archives an account', async () => {
      const archived = { ...mockAccount, is_archived: true };
      queryMock.mockResolvedValue({ rows: [archived] });

      const result = await accountService.archiveAccount('acc-1', userId);
      expect(result.is_archived).toBe(true);
      const sql = queryMock.mock.calls[0][0];
      expect(sql).toContain('is_archived = true');
    });
  });

  describe('getAccountBalanceHistory', () => {
    it('returns balance history for an account', async () => {
      const history = [
        { date: '2026-01-01', daily_change: '100', running_balance: '1100' },
        { date: '2026-01-02', daily_change: '-50', running_balance: '1050' },
      ];
      queryMock.mockResolvedValue({ rows: history });

      const result = await accountService.getAccountBalanceHistory('acc-1', userId, '2026-01-01', '2026-01-31');
      expect(result).toHaveLength(2);
    });

    it('uses default date range when not provided', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      await accountService.getAccountBalanceHistory('acc-1', userId);
      const params = queryMock.mock.calls[0][1];
      expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(params[2]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
