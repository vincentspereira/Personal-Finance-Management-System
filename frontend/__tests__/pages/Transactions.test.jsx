import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Transactions from '../../src/pages/Transactions';

vi.mock('../../src/api', () => ({
  transactionsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    export: vi.fn(),
  },
  categoriesApi: {
    list: vi.fn(),
  },
  accountsApi: {
    list: vi.fn(),
  },
  exportApi: {
    transactionsCSV: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { transactionsApi, categoriesApi, accountsApi, exportApi } from '../../src/api';

const mockLoadData = () => {
  categoriesApi.list.mockResolvedValue({
    data: [
      { id: 'cat-1', name: 'Groceries', type: 'expense', children: [] },
      { id: 'cat-2', name: 'Salary', type: 'income', children: [] },
    ],
  });
  accountsApi.list.mockResolvedValue({
    data: [{ id: 'acc-1', name: 'Checking', type: 'checking' }],
  });
  transactionsApi.list.mockResolvedValue({
    data: [
      { id: 't1', transaction_date: '2026-04-20', description: 'Lunch', merchant_name: 'Subway', category_name: 'Dining', type: 'expense', amount: 25, account_name: 'Checking', account_id: 'acc-1', category_id: 'cat-1', notes: '', tags: [] },
    ],
    meta: { pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
  });
};

const renderTransactions = () =>
  render(
    <BrowserRouter>
      <Transactions />
    </BrowserRouter>
  );

describe('Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('renders loading then transactions table', async () => {
    mockLoadData();
    renderTransactions();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Lunch')).toBeInTheDocument());
  });

  it('shows filter button and toggles filters panel', async () => {
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Filters')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument());
  });

  it('opens add transaction modal', async () => {
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Add')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('Add Transaction')).toBeInTheDocument());
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('creates a transaction via modal', async () => {
    mockLoadData();
    transactionsApi.create.mockResolvedValue({ data: { id: 'new' } });
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Add')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('Create')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('What was this for?'), { target: { value: 'Test txn' } });
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(transactionsApi.create).toHaveBeenCalled());
  });

  it('opens edit modal when Edit clicked', async () => {
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('Edit Transaction')).toBeInTheDocument());
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('updates an existing transaction', async () => {
    mockLoadData();
    transactionsApi.update.mockResolvedValue({ data: { id: 't1' } });
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('Update')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => expect(transactionsApi.update).toHaveBeenCalled());
  });

  it('deletes a transaction', async () => {
    mockLoadData();
    transactionsApi.delete.mockResolvedValue({ data: null });
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(transactionsApi.delete).toHaveBeenCalledWith('t1'));
  });

  it('cancels delete when confirm is false', async () => {
    window.confirm = vi.fn(() => false);
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Delete'));
    expect(transactionsApi.delete).not.toHaveBeenCalled();
  });

  it('paginates with Next button', async () => {
    mockLoadData();
    transactionsApi.list.mockResolvedValue({
      data: [{ id: 't1', transaction_date: '2026-04-20', description: 'Lunch', category_name: 'Dining', type: 'expense', amount: 25, account_id: 'a', category_id: 'c' }],
      meta: { pagination: { total: 100, page: 1, limit: 50, totalPages: 2 } },
    });
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Next')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(transactionsApi.list).toHaveBeenCalledTimes(2));
  });

  it('paginates with Previous button', async () => {
    mockLoadData();
    transactionsApi.list.mockResolvedValue({
      data: [],
      meta: { pagination: { total: 100, page: 2, limit: 50, totalPages: 2 } },
    });
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Previous')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => expect(transactionsApi.list).toHaveBeenCalledTimes(2));
  });

  it('shows transaction type badges', async () => {
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('expense')).toBeInTheDocument());
  });

  it('closes modal on Cancel click', async () => {
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Add')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument());
    const cancelBtns = screen.getAllByText('Cancel');
    fireEvent.click(cancelBtns[0]);
    await waitFor(() => expect(screen.queryByText('Add Transaction')).not.toBeInTheDocument());
  });

  it('handles export CSV click', async () => {
    mockLoadData();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    exportApi.transactionsCSV.mockResolvedValue(new Blob(['csv'], { type: 'text/csv' }));
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Export CSV')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() => expect(exportApi.transactionsCSV).toHaveBeenCalled());
  });

  it('handles export error', async () => {
    mockLoadData();
    exportApi.transactionsCSV.mockRejectedValue(new Error('Export failed'));
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Export CSV')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() => expect(exportApi.transactionsCSV).toHaveBeenCalled());
    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalled();
  });

  it('toggles filters on and off', async () => {
    mockLoadData();
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Filters')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument());
  });

  it('handles list API error', async () => {
    categoriesApi.list.mockResolvedValue({ data: [] });
    accountsApi.list.mockResolvedValue({ data: [] });
    transactionsApi.list.mockRejectedValue(new Error('Fetch failed'));
    renderTransactions();
    await waitFor(() => expect(transactionsApi.list).toHaveBeenCalled());
    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalled();
  });

  it('handles create error', async () => {
    mockLoadData();
    transactionsApi.create.mockRejectedValue(new Error('Create failed'));
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Add')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => expect(screen.getByText('Create')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(transactionsApi.create).toHaveBeenCalled());
    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalledWith('Create failed');
  });

  it('handles update error', async () => {
    mockLoadData();
    transactionsApi.update.mockRejectedValue(new Error('Update failed'));
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('Update')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => expect(transactionsApi.update).toHaveBeenCalled());
    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalledWith('Update failed');
  });

  it('handles delete error', async () => {
    mockLoadData();
    transactionsApi.delete.mockRejectedValue(new Error('Delete failed'));
    renderTransactions();
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(transactionsApi.delete).toHaveBeenCalled());
    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalledWith('Delete failed');
  });

  it('renders pagination info', async () => {
    mockLoadData();
    transactionsApi.list.mockResolvedValue({
      data: [{ id: 't1', transaction_date: '2026-04-20', description: 'Lunch', category_name: 'Dining', type: 'expense', amount: 25 }],
      meta: { pagination: { total: 50, page: 2, limit: 50, totalPages: 3 } },
    });
    renderTransactions();
    await waitFor(() => expect(screen.getByText(/50 transactions/)).toBeInTheDocument());
  });
});
