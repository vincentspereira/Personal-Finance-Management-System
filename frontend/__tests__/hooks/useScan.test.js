import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScan } from '../../src/hooks/useScan';

vi.mock('../../src/api', () => ({
  scansApi: {
    upload: vi.fn(),
    status: vi.fn(),
    results: vi.fn(),
    confirm: vi.fn(),
    retry: vi.fn(),
    list: vi.fn(),
  },
}));

import { scansApi } from '../../src/api';

describe('useScan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useScan());
    expect(result.current.scans).toEqual([]);
    expect(result.current.currentScan).toBeNull();
    expect(result.current.documents).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('upload sends files and starts polling', async () => {
    scansApi.upload.mockResolvedValue({
      data: [{ id: 'scan-1', status: 'pending' }],
    });
    scansApi.status.mockResolvedValue({ data: { status: 'completed' } });
    scansApi.results.mockResolvedValue({
      data: { scan: { id: 'scan-1' }, documents: [{ id: 'doc-1', vendor_name: 'Test' }] },
    });

    const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
    const { result } = renderHook(() => useScan());

    let uploaded;
    await act(async () => {
      uploaded = await result.current.upload(files);
    });

    expect(scansApi.upload).toHaveBeenCalledWith(files);
    expect(result.current.currentScan.id).toBe('scan-1');

    // Advance timer to trigger polling
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(scansApi.status).toHaveBeenCalledWith('scan-1');
  });

  it('upload handles error', async () => {
    scansApi.upload.mockRejectedValue(new Error('Upload failed'));

    const { result } = renderHook(() => useScan());

    const files = [new File(['test'], 'receipt.jpg')];
    let uploaded;
    await act(async () => {
      uploaded = await result.current.upload(files);
    });

    expect(uploaded).toEqual([]);
    expect(result.current.error).toBe('Upload failed');
  });

  it('confirm sends documents and resets state', async () => {
    scansApi.confirm.mockResolvedValue({ data: { confirmed: 1 } });

    const { result } = renderHook(() => useScan());

    let success;
    await act(async () => {
      success = await result.current.confirm('scan-1', [{ documentIndex: 0, categoryId: 'c1', accountId: 'a1', amount: 50, description: 'test', merchantName: 'Test', transactionDate: '2026-01-01' }]);
    });

    expect(success).toBe(true);
    expect(scansApi.confirm).toHaveBeenCalledWith('scan-1', expect.any(Array));
    expect(result.current.documents).toEqual([]);
    expect(result.current.currentScan).toBeNull();
  });

  it('confirm handles error', async () => {
    scansApi.confirm.mockRejectedValue(new Error('Confirm failed'));

    const { result } = renderHook(() => useScan());

    let success;
    await act(async () => {
      success = await result.current.confirm('scan-1', []);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Confirm failed');
  });

  it('retry calls API and starts polling', async () => {
    scansApi.retry.mockResolvedValue({ data: {} });
    scansApi.status.mockResolvedValue({ data: { status: 'pending' } });

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.retry('scan-1');
    });

    expect(scansApi.retry).toHaveBeenCalledWith('scan-1');
  });

  it('retry handles error', async () => {
    scansApi.retry.mockRejectedValue(new Error('Retry failed'));

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.retry('scan-1');
    });

    expect(result.current.error).toBe('Retry failed');
  });

  it('fetchHistory returns paginated scans', async () => {
    scansApi.list.mockResolvedValue({
      data: [{ id: 'scan-1' }],
      meta: { pagination: { total: 1 } },
    });

    const { result } = renderHook(() => useScan());

    let pagination;
    await act(async () => {
      pagination = await result.current.fetchHistory(1);
    });

    expect(scansApi.list).toHaveBeenCalledWith({ page: 1 });
    expect(result.current.scans).toHaveLength(1);
  });

  it('fetchHistory handles error', async () => {
    scansApi.list.mockRejectedValue(new Error('List failed'));

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.fetchHistory(1);
    });

    expect(result.current.error).toBe('List failed');
  });
});
