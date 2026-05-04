import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../src/components/Sidebar';

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@test.com', name: 'Test User' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggle: vi.fn() }),
}));

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Sidebar', () => {
  it('renders all navigation items when open', () => {
    renderWithRouter(<Sidebar open={true} onToggle={() => {}} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Scan Invoices')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides labels when collapsed', () => {
    renderWithRouter(<Sidebar open={false} onToggle={() => {}} />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Transactions')).not.toBeInTheDocument();
  });

  it('shows PFMS brand when open', () => {
    renderWithRouter(<Sidebar open={true} onToggle={() => {}} />);
    expect(screen.getByText('PFMS')).toBeInTheDocument();
  });

  it('calls onToggle when toggle button clicked', () => {
    const onToggle = vi.fn();
    renderWithRouter(<Sidebar open={true} onToggle={onToggle} />);
    const buttons = screen.getAllByRole('button');
    const toggleBtn = buttons.find(b => b.querySelector('svg'));
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalled();
  });

  it('applies active style to current route', () => {
    renderWithRouter(<Sidebar open={true} onToggle={() => {}} />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('flex');
  });

  it('shows user email when open', () => {
    renderWithRouter(<Sidebar open={true} onToggle={() => {}} />);
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('shows Sign Out button', () => {
    renderWithRouter(<Sidebar open={true} onToggle={() => {}} />);
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });
});
