import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ScanPage from '../../src/pages/Scan';

vi.mock('../../src/api', () => ({
  scansApi: {
    upload: vi.fn(),
    status: vi.fn(),
    results: vi.fn(),
    confirm: vi.fn(),
    retry: vi.fn(),
    list: vi.fn(),
  },
  categoriesApi: {
    list: vi.fn(),
  },
  accountsApi: {
    list: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

let dropzoneOnDrop = null;
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }) => {
    dropzoneOnDrop = onDrop;
    return {
      getRootProps: () => ({ onClick: () => {} }),
      getInputProps: () => ({ type: 'file' }),
      isDragActive: false,
    };
  },
}));

import { scansApi, categoriesApi, accountsApi } from '../../src/api';

const mockScanData = () => {
  categoriesApi.list.mockResolvedValue({
    data: [{ id: 'cat-1', name: 'Groceries', type: 'expense', children: [] }],
  });
  accountsApi.list.mockResolvedValue({
    data: [{ id: 'acc-1', name: 'Checking', type: 'checking' }],
  });
  scansApi.list.mockResolvedValue({ data: [] });
};

const renderScan = () =>
  render(
    <BrowserRouter>
      <ScanPage />
    </BrowserRouter>
  );

// Helper: trigger upload then complete polling cycle
async function uploadAndComplete(docs) {
  mockScanData();
  scansApi.upload.mockResolvedValue({ data: [{ id: 'scan-2', status: 'pending' }] });
  scansApi.status.mockImplementation(() => Promise.resolve({ data: { status: 'completed' } }));
  scansApi.results.mockResolvedValue({
    data: { documents: docs },
  });

  renderScan();
  await waitFor(() => expect(dropzoneOnDrop).toBeTruthy());

  const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
  await act(async () => {
    await dropzoneOnDrop(files);
  });

  // Wait for the polling interval to fire (real timers, 2000ms)
  // We need to wait for the status check to resolve
  await waitFor(() => expect(scansApi.status).toHaveBeenCalledWith('scan-2'), { timeout: 5000 });
  await waitFor(() => expect(scansApi.results).toHaveBeenCalledWith('scan-2'), { timeout: 5000 });

  return docs;
}

describe('ScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dropzoneOnDrop = null;
  });

  it('renders upload tab by default', async () => {
    mockScanData();
    renderScan();
    await waitFor(() => expect(screen.getByText('Scan Invoices')).toBeInTheDocument());
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('renders dropzone upload area', async () => {
    mockScanData();
    renderScan();
    await waitFor(() => expect(screen.getByText(/Drag & drop invoices/)).toBeInTheDocument());
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('Take Photo')).toBeInTheDocument();
  });

  it('switches to history tab', async () => {
    mockScanData();
    scansApi.list.mockResolvedValue({
      data: [{ id: 'scan-1', filename: 'receipt.jpg', status: 'completed', document_count: 1, created_at: '2026-04-20T10:00:00Z' }],
    });
    renderScan();
    await waitFor(() => expect(screen.getByText('History')).toBeInTheDocument());
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => expect(screen.getByText('receipt.jpg')).toBeInTheDocument());
  });

  it('shows empty placeholder in results panel', async () => {
    mockScanData();
    renderScan();
    await waitFor(() => expect(screen.getByText(/Upload an invoice to see extracted data/)).toBeInTheDocument());
  });

  it('shows empty history when no scans', async () => {
    mockScanData();
    renderScan();
    await waitFor(() => expect(screen.getByText('History')).toBeInTheDocument());
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => expect(screen.getByText('No scan history yet')).toBeInTheDocument());
  });

  it('handles file upload via dropzone onDrop', async () => {
    mockScanData();
    scansApi.upload.mockResolvedValue({ data: [{ id: 'scan-2', status: 'pending' }] });
    renderScan();
    await waitFor(() => expect(dropzoneOnDrop).toBeTruthy());

    const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
    await act(async () => { await dropzoneOnDrop(files); });
    expect(scansApi.upload).toHaveBeenCalledWith(files);
  });

  it('handles upload error', async () => {
    mockScanData();
    scansApi.upload.mockRejectedValue(new Error('Upload failed'));
    renderScan();
    await waitFor(() => expect(dropzoneOnDrop).toBeTruthy());

    const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
    await act(async () => { await dropzoneOnDrop(files); });

    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalledWith('Upload failed');
  });

  it('handles empty file drop', async () => {
    mockScanData();
    renderScan();
    await waitFor(() => expect(dropzoneOnDrop).toBeTruthy());
    await act(async () => { await dropzoneOnDrop([]); });
    expect(scansApi.upload).not.toHaveBeenCalled();
  });

  it('handles upload with no scan data returned', async () => {
    mockScanData();
    scansApi.upload.mockResolvedValue({ data: [] });
    renderScan();
    await waitFor(() => expect(dropzoneOnDrop).toBeTruthy());

    const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
    await act(async () => { await dropzoneOnDrop(files); });

    const toast = await import('react-hot-toast');
    expect(toast.default.success).toHaveBeenCalled();
  });

  it('shows processing status after upload', async () => {
    mockScanData();
    scansApi.upload.mockResolvedValue({ data: [{ id: 'scan-2', status: 'pending' }] });
    renderScan();
    await waitFor(() => expect(dropzoneOnDrop).toBeTruthy());

    const files = [new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })];
    await act(async () => { await dropzoneOnDrop(files); });
    await waitFor(() => expect(screen.getByText(/AI is analyzing/)).toBeInTheDocument());
  });

  it('shows completed scan with high confidence document', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.92 },
    ]);
    await waitFor(() => expect(screen.getByText('Confirm All')).toBeInTheDocument());
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  }, 10000);

  it('shows medium confidence badge', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.7 },
    ]);
    await waitFor(() => expect(screen.getByText(/70%/)).toBeInTheDocument());
  }, 10000);

  it('shows low confidence badge', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.4 },
    ]);
    await waitFor(() => expect(screen.getByText(/40%/)).toBeInTheDocument());
  }, 10000);

  it('shows no confidence badge for null score', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: null },
    ]);
    await waitFor(() => expect(screen.getByText(/0%/)).toBeInTheDocument());
  }, 10000);

  it('shows document with line items', async () => {
    await uploadAndComplete([
      {
        id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01',
        document_type: 'invoice', confidence_score: 0.9,
        line_items: [{ description: 'Item 1', total: 25 }, { description: 'Item 2', total: 25 }],
      },
    ]);
    await waitFor(() => expect(screen.getByText('Line Items')).toBeInTheDocument());
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  }, 10000);

  it('handles string line items (parsed)', async () => {
    await uploadAndComplete([
      {
        id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01',
        document_type: 'invoice', confidence_score: 0.9,
        line_items: JSON.stringify([{ description: 'Parsed Item', total: 50 }]),
      },
    ]);
    await waitFor(() => expect(screen.getByText('Parsed Item')).toBeInTheDocument());
  }, 10000);

  it('confirms extracted documents', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.85 },
    ]);
    await waitFor(() => expect(screen.getByText('Confirm All')).toBeInTheDocument());

    scansApi.confirm.mockResolvedValue({ data: { confirmed: 1 } });
    await act(async () => { fireEvent.click(screen.getByText('Confirm All')); });
    expect(scansApi.confirm).toHaveBeenCalled();
  }, 10000);

  it('handles confirm error', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.85 },
    ]);
    await waitFor(() => expect(screen.getByText('Confirm All')).toBeInTheDocument());

    scansApi.confirm.mockRejectedValue(new Error('Confirm failed'));
    await act(async () => { fireEvent.click(screen.getByText('Confirm All')); });

    const toast = await import('react-hot-toast');
    expect(toast.default.error).toHaveBeenCalledWith('Confirm failed');
  }, 10000);

  it('edits document vendor field', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.85 },
    ]);
    await waitFor(() => expect(screen.getByDisplayValue('Store')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Store'), { target: { value: 'New Store' } });
    expect(screen.getByDisplayValue('New Store')).toBeInTheDocument();
  }, 10000);

  it('shows document type badge', async () => {
    await uploadAndComplete([
      { id: 'doc-1', vendor_name: 'Store', total_amount: 50, document_date: '2026-01-01', document_type: 'receipt', confidence_score: 0.9 },
    ]);
    await waitFor(() => expect(screen.getByText('receipt')).toBeInTheDocument());
  }, 10000);

  it('renders history with failed status', async () => {
    mockScanData();
    scansApi.list.mockResolvedValue({
      data: [{ id: 'scan-1', filename: 'bad.pdf', status: 'failed', document_count: 0, created_at: '2026-04-20T10:00:00Z' }],
    });
    renderScan();
    await waitFor(() => expect(screen.getByText('History')).toBeInTheDocument());
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());
  });

  it('renders history with document count', async () => {
    mockScanData();
    scansApi.list.mockResolvedValue({
      data: [{ id: 'scan-1', filename: 'inv.pdf', status: 'completed', document_count: 3, created_at: '2026-04-20T10:00:00Z' }],
    });
    renderScan();
    await waitFor(() => expect(screen.getByText('History')).toBeInTheDocument());
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => expect(screen.getByText('3 doc(s)')).toBeInTheDocument());
  });
});
