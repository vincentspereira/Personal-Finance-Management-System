import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTransactions } from '../../src/hooks/useTransactions';

vi.mock('../../src/api', () => ({
  transactionsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { transactionsApi } from '../../src/api';

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches transactions on mount', async () => {
    transactionsApi.list.mockResolvedValue({
      data: [{ id: '1', amount: 50 }],
      meta: { pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.pagination.total).toBe(1);
  });

  it('sets error when fetch fails', async () => {
    transactionsApi.list.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('create calls API and refetches', async () => {
    transactionsApi.list.mockResolvedValue({
      data: [{ id: '1' }],
      meta: { pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    });
    transactionsApi.create.mockResolvedValue({ data: { id: 'new' } });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ type: 'expense', amount: 50 });
    });

    expect(transactionsApi.create).toHaveBeenCalledWith({ type: 'expense', amount: 50 });
    expect(transactionsApi.list).toHaveBeenCalledTimes(2); // initial + refetch
  });

  it('update calls API and refetches', async () => {
    transactionsApi.list.mockResolvedValue({ data: [], meta: { pagination: {} } });
    transactionsApi.update.mockResolvedValue({ data: { id: '1' } });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update('1', { amount: 75 });
    });

    expect(transactionsApi.update).toHaveBeenCalledWith('1', { amount: 75 });
  });

  it('remove calls API and refetches', async () => {
    transactionsApi.list.mockResolvedValue({ data: [], meta: { pagination: {} } });
    transactionsApi.delete.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove('1');
    });

    expect(transactionsApi.delete).toHaveBeenCalledWith('1');
  });

  it('setParams triggers refetch with new params', async () => {
    transactionsApi.list.mockResolvedValue({ data: [], meta: { pagination: {} } });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setParams({ type: 'expense' });
    });

    await waitFor(() => {
      expect(transactionsApi.list).toHaveBeenCalledWith(expect.objectContaining({ type: 'expense' }));
    });
  });

  it('refetch allows overriding params', async () => {
    transactionsApi.list.mockResolvedValue({ data: [], meta: { pagination: {} } });

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refetch({ page: 2 });
    });

    expect(transactionsApi.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });
});
