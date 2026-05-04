import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../src/pages/Dashboard';

vi.mock('../../src/api', () => ({
  analyticsApi: {
    summary: vi.fn(),
    trends: vi.fn(),
    byCategory: vi.fn(),
    cashflow: vi.fn(),
    budgetAlerts: vi.fn(),
    netWorth: vi.fn(),
  },
  transactionsApi: {
    list: vi.fn(),
  },
  budgetsApi: {
    list: vi.fn(),
  },
  recurringApi: {
    upcoming: vi.fn(),
  },
  savingsGoalsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

import { analyticsApi, transactionsApi, budgetsApi, recurringApi, savingsGoalsApi } from '../../src/api';

const mockDashboardData = () => {
  analyticsApi.summary.mockResolvedValue({
    data: { total_income: 5000, total_expense: 3000, net: 2000, income_change: 10, expense_change: -5, savings_rate: 40 },
  });
  analyticsApi.trends.mockResolvedValue({
    data: [
      { month: '2026-01', income: 5000, expense: 3000 },
      { month: '2026-02', income: 5500, expense: 3200 },
    ],
  });
  analyticsApi.byCategory.mockResolvedValue({
    data: [
      { id: 'c1', name: 'Groceries', total: 500, type: 'expense', color: '#3b82f6', transaction_count: 10 },
    ],
  });
  analyticsApi.cashflow.mockResolvedValue({
    data: [
      { date: '2026-04-20', income: 100, expense: 50 },
    ],
  });
  budgetsApi.list.mockResolvedValue({
    data: [
      { id: 'b1', category_name: 'Groceries', amount: 600, actual_spent: 400 },
    ],
  });
  transactionsApi.list.mockResolvedValue({
    data: [
      { id: 't1', transaction_date: '2026-04-20', description: 'Lunch', category_name: 'Dining', type: 'expense', amount: 25 },
    ],
  });
  analyticsApi.budgetAlerts.mockResolvedValue({ data: [] });
  analyticsApi.netWorth.mockResolvedValue({ data: null });
  recurringApi.upcoming.mockResolvedValue({ data: [] });
  savingsGoalsApi.list.mockResolvedValue({ data: [] });
};

const renderDashboard = () =>
  render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading spinner initially', () => {
    mockDashboardData();
    renderDashboard();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders KPI cards after loading', async () => {
    mockDashboardData();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Total Income')).toBeInTheDocument());
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net Savings')).toBeInTheDocument();
    expect(screen.getByText('Top Category')).toBeInTheDocument();
  });

  it('renders chart sections', async () => {
    mockDashboardData();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Income vs Expenses (12 Months)')).toBeInTheDocument());
    expect(screen.getByText('Expense Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Daily Cashflow (30 Days)')).toBeInTheDocument();
    expect(screen.getByText('Budget Progress')).toBeInTheDocument();
  });

  it('renders recent transactions table', async () => {
    mockDashboardData();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Recent Transactions')).toBeInTheDocument());
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  it('renders budget progress bars', async () => {
    mockDashboardData();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Groceries')).toBeInTheDocument());
  });

  it('shows top category name', async () => {
    mockDashboardData();
    renderDashboard();
    await waitFor(() => {
      const topCatElements = screen.getAllByText('Groceries');
      expect(topCatElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty message when no budgets', async () => {
    mockDashboardData();
    budgetsApi.list.mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/No budgets set/)).toBeInTheDocument());
  });

  it('shows empty message when no expense data', async () => {
    mockDashboardData();
    analyticsApi.byCategory.mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/No expense data/)).toBeInTheDocument());
  });

  it('handles API errors gracefully', async () => {
    analyticsApi.summary.mockResolvedValue({ data: null });
    analyticsApi.trends.mockResolvedValue({ data: null });
    analyticsApi.byCategory.mockResolvedValue({ data: null });
    analyticsApi.cashflow.mockResolvedValue({ data: null });
    budgetsApi.list.mockResolvedValue({ data: null });
    transactionsApi.list.mockResolvedValue({ data: null });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('navigates on Add Transaction click', async () => {
    mockDashboardData();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Add Transaction')).toBeInTheDocument());
  });

  it('renders no transactions message when empty', async () => {
    mockDashboardData();
    transactionsApi.list.mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/No transactions yet/)).toBeInTheDocument());
  });

  it('renders income transaction type correctly', async () => {
    mockDashboardData();
    transactionsApi.list.mockResolvedValue({
      data: [
        { id: 't1', transaction_date: '2026-04-20', description: 'Salary', category_name: 'Income', type: 'income', amount: 5000 },
      ],
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Salary')).toBeInTheDocument());
    expect(screen.getByText('income')).toBeInTheDocument();
  });

  it('renders transaction without category', async () => {
    mockDashboardData();
    transactionsApi.list.mockResolvedValue({
      data: [
        { id: 't1', transaction_date: '2026-04-20', description: 'Test', category_name: null, type: 'expense', amount: 10 },
      ],
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
  });

  it('renders budget progress over budget', async () => {
    mockDashboardData();
    budgetsApi.list.mockResolvedValue({
      data: [{ id: 'b1', category_name: 'Food', amount: 100, actual_spent: 150 }],
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Food')).toBeInTheDocument());
  });

  it('renders transaction with transfer type', async () => {
    mockDashboardData();
    transactionsApi.list.mockResolvedValue({
      data: [
        { id: 't1', transaction_date: '2026-04-20', description: 'Transfer', category_name: null, type: 'transfer', amount: 100 },
      ],
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('transfer')).toBeInTheDocument());
  });
});
