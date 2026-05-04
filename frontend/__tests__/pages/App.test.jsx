import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

vi.mock('../../src/pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>,
}));
vi.mock('../../src/pages/Transactions', () => ({
  default: () => <div data-testid="transactions">Transactions</div>,
}));
vi.mock('../../src/pages/Scan', () => ({
  default: () => <div data-testid="scan">Scan</div>,
}));
vi.mock('../../src/pages/Analytics', () => ({
  default: () => <div data-testid="analytics">Analytics</div>,
}));
vi.mock('../../src/pages/Reports', () => ({
  default: () => <div data-testid="reports">Reports</div>,
}));
vi.mock('../../src/pages/Settings', () => ({
  default: () => <div data-testid="settings">Settings</div>,
}));
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@test.com', name: 'Test User' },
    token: 'mock-token',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getAuthHeaders: vi.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggle: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}));

describe('App', () => {
  it('renders Dashboard for / route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders Dashboard for /dashboard route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders Transactions for /transactions route', () => {
    render(
      <MemoryRouter initialEntries={['/transactions']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('transactions')).toBeInTheDocument();
  });

  it('renders Scan for /scan route', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('scan')).toBeInTheDocument();
  });

  it('renders Analytics for /analytics route', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('analytics')).toBeInTheDocument();
  });

  it('renders Reports for /reports route', () => {
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('reports')).toBeInTheDocument();
  });

  it('renders Settings for /settings route', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('settings')).toBeInTheDocument();
  });

  it('renders Sidebar component', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('PFMS')).toBeInTheDocument();
  });

  it('toggles sidebar on button click', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('PFMS')).toBeInTheDocument();
    const toggleBtn = screen.getAllByRole('button').find(b => b.querySelector('svg'));
    fireEvent.click(toggleBtn);
    expect(screen.queryByText('PFMS')).not.toBeInTheDocument();
  });
});
