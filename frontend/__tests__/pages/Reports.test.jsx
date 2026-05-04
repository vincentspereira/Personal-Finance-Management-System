import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Reports from '../../src/pages/Reports';

vi.mock('../../src/api', () => ({
  reportsApi: {
    monthly: vi.fn(),
    annual: vi.fn(),
    netWorth: vi.fn(),
  },
  analyticsApi: {},
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { reportsApi } from '../../src/api';

const mockReportData = () => {
  reportsApi.monthly.mockResolvedValue({
    data: {
      summary: { total_income: 5000, total_expense: 3000, net: 2000 },
      categories: [
        { id: 'c1', name: 'Groceries', total: 500, type: 'expense', color: '#3b82f6' },
      ],
      trends: [{ month: '2026-01', income: 5000, expense: 3000 }],
    },
  });
  reportsApi.annual.mockResolvedValue({
    data: {
      summary: { total_income: 60000, total_expense: 36000, net: 24000 },
      categories: [],
      trends: [],
      monthly_breakdown: [
        { month: '2026-01', income: 5000, expense: 3000, net: 2000, transaction_count: 45 },
      ],
    },
  });
  reportsApi.netWorth.mockResolvedValue({
    data: {
      total_net_worth: 50000,
      accounts: [
        { id: 'a1', name: 'Checking', type: 'checking', balance: 5000 },
        { id: 'a2', name: 'Savings', type: 'savings', balance: 45000 },
      ],
    },
  });
};

const renderReports = () =>
  render(
    <BrowserRouter>
      <Reports />
    </BrowserRouter>
  );

describe('Reports', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders with monthly report by default', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('shows income, expenses, net KPI cards', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => {
      expect(screen.getByText('Income')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Net')).toBeInTheDocument();
    });
  });

  it('switches to annual tab and loads annual data', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Annual')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Annual'));
    await waitFor(() => expect(reportsApi.annual).toHaveBeenCalled());
  });

  it('shows month-by-month breakdown in annual view', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Annual')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Annual'));
    await waitFor(() => expect(screen.getByText('Month-by-Month Breakdown')).toBeInTheDocument());
  });

  it('switches to net worth tab', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Net Worth')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Net Worth'));
    await waitFor(() => expect(screen.getByText('Total Net Worth')).toBeInTheDocument());
  });

  it('shows accounts in net worth view', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Net Worth')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Net Worth'));
    await waitFor(() => {
      expect(screen.getByText('Checking')).toBeInTheDocument();
      expect(screen.getByText('Savings')).toBeInTheDocument();
    });
  });

  it('shows category breakdown when present', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Category Breakdown')).toBeInTheDocument());
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('shows export PDF button', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Export PDF')).toBeInTheDocument());
  });

  it('shows no data message when report is null', async () => {
    reportsApi.monthly.mockResolvedValue({ data: null });
    reportsApi.netWorth.mockResolvedValue({ data: null });
    renderReports();
    await waitFor(() => expect(screen.getByText(/No data for this period/)).toBeInTheDocument());
  });

  it('handles month/year selector changes', async () => {
    mockReportData();
    renderReports();
    await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());
    const selects = screen.getAllByRole('combobox');
    if (selects.length >= 2) {
      fireEvent.change(selects[0], { target: { value: 3 } });
      await waitFor(() => expect(reportsApi.monthly).toHaveBeenCalledTimes(2));
    }
  });

  it('handles loadMonthly error', async () => {
    reportsApi.monthly.mockRejectedValue(new Error('Report failed'));
    reportsApi.netWorth.mockResolvedValue({ data: null });
    renderReports();
    await waitFor(() => expect(reportsApi.monthly).toHaveBeenCalled());
  });

  it('handles loadAnnual error', async () => {
    reportsApi.monthly.mockRejectedValue(new Error('Monthly failed'));
    reportsApi.annual.mockRejectedValue(new Error('Annual failed'));
    reportsApi.netWorth.mockResolvedValue({ data: null });
    renderReports();
    await waitFor(() => expect(screen.getByText('Annual')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Annual'));
    await waitFor(() => expect(reportsApi.annual).toHaveBeenCalled());
  });

  it('handles loadNetWorth error', async () => {
    reportsApi.netWorth.mockRejectedValue(new Error('Net worth failed'));
    reportsApi.monthly.mockResolvedValue({ data: null });
    renderReports();
    await waitFor(() => expect(reportsApi.netWorth).toHaveBeenCalled());
  });

  it('shows no data when monthly report is null', async () => {
    reportsApi.monthly.mockResolvedValue({ data: null });
    reportsApi.netWorth.mockResolvedValue({ data: null });
    renderReports();
    await waitFor(() => expect(screen.getByText(/No data for this period/)).toBeInTheDocument());
  });

  it('triggers print on Export PDF click', async () => {
    mockReportData();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderReports();
    await waitFor(() => expect(screen.getByText('Export PDF')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Export PDF'));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
