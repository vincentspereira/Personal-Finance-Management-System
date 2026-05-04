import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../../src/hooks/useAnalytics';

// Mock the API
vi.mock('../../src/api', () => ({
  analyticsApi: {
    summary: vi.fn(),
    byCategory: vi.fn(),
    trends: vi.fn(),
  },
}));

import { analyticsApi } from '../../src/api';

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.summary).toBeNull();
    expect(result.current.byCategory).toEqual([]);
    expect(result.current.trends).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchSummary updates state on success', async () => {
    const mockData = { total_income: '5000', total_expense: '3000', net: '2000' };
    analyticsApi.summary.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchSummary('2026-01-01', '2026-01-31');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toEqual(mockData);
    expect(analyticsApi.summary).toHaveBeenCalledWith({ startDate: '2026-01-01', endDate: '2026-01-31' });
  });

  it('fetchSummary sets error on failure', async () => {
    analyticsApi.summary.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchSummary('2026-01-01', '2026-01-31');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('fetchByCategory updates state', async () => {
    const mockData = [{ id: 'c1', name: 'Groceries', total: 500 }];
    analyticsApi.byCategory.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchByCategory('2026-01-01', '2026-01-31');

    await waitFor(() => {
      expect(result.current.byCategory).toHaveLength(1);
    });
  });

  it('fetchByCategory handles error', async () => {
    analyticsApi.byCategory.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchByCategory('2026-01-01', '2026-01-31');

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });
  });

  it('fetchTrends updates state', async () => {
    const mockData = [{ month: '2026-01', income: 5000, expense: 3000 }];
    analyticsApi.trends.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchTrends(6);

    await waitFor(() => {
      expect(result.current.trends).toHaveLength(1);
    });

    expect(analyticsApi.trends).toHaveBeenCalledWith({ months: 6 });
  });

  it('fetchTrends defaults to 12 months', async () => {
    analyticsApi.trends.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchTrends();

    await waitFor(() => {
      expect(analyticsApi.trends).toHaveBeenCalledWith({ months: 12 });
    });
  });

  it('fetchTrends handles error', async () => {
    analyticsApi.trends.mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useAnalytics());

    result.current.fetchTrends();

    await waitFor(() => {
      expect(result.current.error).toBe('Failed');
    });
  });
});
