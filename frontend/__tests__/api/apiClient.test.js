import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  transactionsApi,
  accountsApi,
  categoriesApi,
  scansApi,
  analyticsApi,
  reportsApi,
  budgetsApi,
} from '../../src/api/index';

// Mock axios
vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn().mockReturnValue(mockInstance),
    },
  };
});

describe('API Client', () => {
  let api;

  beforeEach(() => {
    vi.clearAllMocks();
    api = axios.create();
  });

  describe('transactionsApi', () => {
    it('list calls GET /transactions with params', async () => {
      api.get.mockResolvedValue({ data: { success: true, data: [] } });
      await transactionsApi.list({ page: 1, type: 'expense' });
      expect(api.get).toHaveBeenCalledWith('/transactions', { params: { page: 1, type: 'expense' } });
    });

    it('get calls GET /transactions/:id', async () => {
      api.get.mockResolvedValue({ data: {} });
      await transactionsApi.get('txn-1');
      expect(api.get).toHaveBeenCalledWith('/transactions/txn-1');
    });

    it('create calls POST /transactions', async () => {
      api.post.mockResolvedValue({ data: {} });
      await transactionsApi.create({ type: 'expense', amount: 50 });
      expect(api.post).toHaveBeenCalledWith('/transactions', { type: 'expense', amount: 50 });
    });

    it('update calls PUT /transactions/:id', async () => {
      api.put.mockResolvedValue({ data: {} });
      await transactionsApi.update('txn-1', { amount: 75 });
      expect(api.put).toHaveBeenCalledWith('/transactions/txn-1', { amount: 75 });
    });

    it('delete calls DELETE /transactions/:id', async () => {
      api.delete.mockResolvedValue({ data: {} });
      await transactionsApi.delete('txn-1');
      expect(api.delete).toHaveBeenCalledWith('/transactions/txn-1');
    });

    it('bulkCreate calls POST /transactions/bulk', async () => {
      api.post.mockResolvedValue({ data: {} });
      await transactionsApi.bulkCreate([{ type: 'expense' }]);
      expect(api.post).toHaveBeenCalledWith('/transactions/bulk', { transactions: [{ type: 'expense' }] });
    });

    it('export handles CSV format', async () => {
      api.get.mockResolvedValue({ data: 'id,type\n1,expense' });
      await transactionsApi.export({ format: 'csv' });
      expect(api.get).toHaveBeenCalledWith('/transactions/export', expect.objectContaining({ responseType: 'blob' }));
    });
  });

  describe('accountsApi', () => {
    it('list calls GET /accounts', async () => {
      api.get.mockResolvedValue({ data: {} });
      await accountsApi.list();
      expect(api.get).toHaveBeenCalledWith('/accounts');
    });

    it('create calls POST /accounts', async () => {
      api.post.mockResolvedValue({ data: {} });
      await accountsApi.create({ name: 'Checking' });
      expect(api.post).toHaveBeenCalledWith('/accounts', { name: 'Checking' });
    });

    it('update calls PUT /accounts/:id', async () => {
      api.put.mockResolvedValue({ data: {} });
      await accountsApi.update('acc-1', { name: 'Savings' });
      expect(api.put).toHaveBeenCalledWith('/accounts/acc-1', { name: 'Savings' });
    });

    it('archive calls DELETE /accounts/:id', async () => {
      api.delete.mockResolvedValue({ data: {} });
      await accountsApi.archive('acc-1');
      expect(api.delete).toHaveBeenCalledWith('/accounts/acc-1');
    });

    it('balance calls GET /accounts/:id/balance', async () => {
      api.get.mockResolvedValue({ data: {} });
      await accountsApi.balance('acc-1', { startDate: '2026-01-01' });
      expect(api.get).toHaveBeenCalledWith('/accounts/acc-1/balance', { params: { startDate: '2026-01-01' } });
    });
  });

  describe('categoriesApi', () => {
    it('list calls GET /categories', async () => {
      api.get.mockResolvedValue({ data: {} });
      await categoriesApi.list();
      expect(api.get).toHaveBeenCalledWith('/categories');
    });

    it('create calls POST /categories', async () => {
      api.post.mockResolvedValue({ data: {} });
      await categoriesApi.create({ name: 'Food' });
      expect(api.post).toHaveBeenCalledWith('/categories', { name: 'Food' });
    });

    it('update calls PUT /categories/:id', async () => {
      api.put.mockResolvedValue({ data: {} });
      await categoriesApi.update('cat-1', { name: 'Groceries' });
      expect(api.put).toHaveBeenCalledWith('/categories/cat-1', { name: 'Groceries' });
    });

    it('delete passes reassignTo as query param', async () => {
      api.delete.mockResolvedValue({ data: {} });
      await categoriesApi.delete('cat-1', 'cat-2');
      expect(api.delete).toHaveBeenCalledWith('/categories/cat-1', { params: { reassignTo: 'cat-2' } });
    });
  });

  describe('scansApi', () => {
    it('upload sends FormData', async () => {
      api.post.mockResolvedValue({ data: {} });
      const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
      await scansApi.upload(files);
      expect(api.post).toHaveBeenCalledWith('/scans/upload', expect.any(FormData), expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }));
    });

    it('status calls GET /scans/:id/status', async () => {
      api.get.mockResolvedValue({ data: {} });
      await scansApi.status('scan-1');
      expect(api.get).toHaveBeenCalledWith('/scans/scan-1/status');
    });

    it('results calls GET /scans/:id/results', async () => {
      api.get.mockResolvedValue({ data: {} });
      await scansApi.results('scan-1');
      expect(api.get).toHaveBeenCalledWith('/scans/scan-1/results');
    });

    it('confirm sends documents array', async () => {
      api.post.mockResolvedValue({ data: {} });
      await scansApi.confirm('scan-1', [{ documentIndex: 0 }]);
      expect(api.post).toHaveBeenCalledWith('/scans/scan-1/confirm', { documents: [{ documentIndex: 0 }] });
    });

    it('retry calls POST /scans/:id/retry', async () => {
      api.post.mockResolvedValue({ data: {} });
      await scansApi.retry('scan-1');
      expect(api.post).toHaveBeenCalledWith('/scans/scan-1/retry');
    });

    it('list calls GET /scans with params', async () => {
      api.get.mockResolvedValue({ data: {} });
      await scansApi.list({ limit: 20 });
      expect(api.get).toHaveBeenCalledWith('/scans', { params: { limit: 20 } });
    });
  });

  describe('analyticsApi', () => {
    it('summary calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.summary({ startDate: '2026-01-01' });
      expect(api.get).toHaveBeenCalledWith('/analytics/summary', { params: { startDate: '2026-01-01' } });
    });

    it('byCategory calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.byCategory({ type: 'expense' });
      expect(api.get).toHaveBeenCalledWith('/analytics/by-category', { params: { type: 'expense' } });
    });

    it('trends calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.trends({ months: 12 });
      expect(api.get).toHaveBeenCalledWith('/analytics/trends', { params: { months: 12 } });
    });

    it('topMerchants calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.topMerchants({ startDate: '2026-01-01' });
      expect(api.get).toHaveBeenCalledWith('/analytics/top-merchants', { params: { startDate: '2026-01-01' } });
    });

    it('cashflow calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.cashflow({ startDate: '2026-01-01' });
      expect(api.get).toHaveBeenCalledWith('/analytics/cashflow', { params: { startDate: '2026-01-01' } });
    });

    it('budgetVsActual calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.budgetVsActual({ period: 'monthly' });
      expect(api.get).toHaveBeenCalledWith('/analytics/budget-vs-actual', { params: { period: 'monthly' } });
    });

    it('recurring calls GET with no params', async () => {
      api.get.mockResolvedValue({ data: {} });
      await analyticsApi.recurring();
      expect(api.get).toHaveBeenCalledWith('/analytics/recurring');
    });
  });

  describe('reportsApi', () => {
    it('monthly calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await reportsApi.monthly({ year: 2026, month: 4 });
      expect(api.get).toHaveBeenCalledWith('/reports/monthly', { params: { year: 2026, month: 4 } });
    });

    it('annual calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await reportsApi.annual({ year: 2026 });
      expect(api.get).toHaveBeenCalledWith('/reports/annual', { params: { year: 2026 } });
    });

    it('custom sends POST with body', async () => {
      api.post.mockResolvedValue({ data: {} });
      await reportsApi.custom({ startDate: '2026-01-01', endDate: '2026-12-31' });
      expect(api.post).toHaveBeenCalledWith('/reports/custom', { startDate: '2026-01-01', endDate: '2026-12-31' });
    });

    it('netWorth calls GET /reports/net-worth', async () => {
      api.get.mockResolvedValue({ data: {} });
      await reportsApi.netWorth();
      expect(api.get).toHaveBeenCalledWith('/reports/net-worth');
    });
  });

  describe('budgetsApi', () => {
    it('CRUD operations call correct endpoints', async () => {
      api.get.mockResolvedValue({ data: {} });
      api.post.mockResolvedValue({ data: {} });
      api.put.mockResolvedValue({ data: {} });
      api.delete.mockResolvedValue({ data: {} });

      await budgetsApi.list();
      expect(api.get).toHaveBeenCalledWith('/budgets');

      await budgetsApi.create({ amount: 500 });
      expect(api.post).toHaveBeenCalledWith('/budgets', { amount: 500 });

      await budgetsApi.update('b1', { amount: 600 });
      expect(api.put).toHaveBeenCalledWith('/budgets/b1', { amount: 600 });

      await budgetsApi.delete('b1');
      expect(api.delete).toHaveBeenCalledWith('/budgets/b1');
    });
  });
});
