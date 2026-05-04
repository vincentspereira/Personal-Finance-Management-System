import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  KPICard,
  DataTable,
  Modal,
  Badge,
  LoadingSpinner,
  PageHeader,
} from '../../src/components/Common';

describe('KPICard', () => {
  it('renders title and value', () => {
    render(<KPICard title="Total Income" value={5000} />);
    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('renders with positive change indicator', () => {
    render(<KPICard title="Income" value={5000} change={15.5} />);
    expect(screen.getByText(/15.5% vs last period/)).toBeInTheDocument();
    expect(screen.getByText(/15.5%/).closest('div')).toHaveClass('text-income');
  });

  it('renders with negative change indicator', () => {
    render(<KPICard title="Expenses" value={3000} change={-10} />);
    expect(screen.getByText(/10.0/)).toBeInTheDocument();
    expect(screen.getByText(/vs last period/)).toBeInTheDocument();
  });

  it('handles zero and null changes', () => {
    const { rerender } = render(<KPICard title="Test" value={100} change={0} />);
    expect(screen.getByText(/0% vs last period/)).toBeInTheDocument();

    rerender(<KPICard title="Test" value={100} change={null} />);
    expect(screen.queryByText(/vs last period/)).not.toBeInTheDocument();
  });

  it('renders custom suffix', () => {
    render(<KPICard title="Rate" value={42.5} prefix="" suffix="%" />);
    expect(screen.getByText(/42\.50/)).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (val) => <span>{val.toUpperCase()}</span> },
  ];
  const data = [
    { id: '1', name: 'Groceries', amount: 50, status: 'active' },
    { id: '2', name: 'Dining', amount: 30, status: 'pending' },
  ];

  it('renders table with data', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const onClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onClick} />);

    fireEvent.click(screen.getByText('Groceries'));
    expect(onClick).toHaveBeenCalledWith(data[0]);
  });

  it('renders custom cell renderers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('Content').closest('.fixed'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies color classes', () => {
    const { container } = render(<Badge color="green">Success</Badge>);
    expect(container.firstChild).toHaveClass('bg-green-500/20');
  });

  it('defaults to blue color', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-blue-500/20');
  });
});

describe('LoadingSpinner', () => {
  it('renders a spinner', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders title and actions', () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={<button>Refresh</button>}
      />
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders without actions', () => {
    render(<PageHeader title="Settings" />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
