import { useState, useEffect, useCallback, useRef } from 'react';
import { transactionsApi, categoriesApi, accountsApi } from '../api';
import { DataTable, Modal, Badge, PageHeader, LoadingSpinner } from '../components/Common';
import { FaPlus, FaDownload, FaSearch, FaFilter, FaUpload, FaFileAlt, FaCheck, FaTimes, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

const emptyForm = {
  account_id: '', category_id: '', type: 'expense', amount: '',
  description: '', merchant_name: '', transaction_date: new Date().toISOString().split('T')[0],
  notes: '', tags: [],
};

const IMPORT_FIELDS = [
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'category', label: 'Category' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags' },
];

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '', categoryId: '', accountId: '', startDate: '', endDate: '', minAmount: '', maxAmount: '', merchant: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // upload | mapping | preview | done
  const [importPreview, setImportPreview] = useState(null);
  const [importMappings, setImportMappings] = useState({});
  const [importAccountId, setImportAccountId] = useState('');
  const [importCategoryId, setImportCategoryId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(flattenCategories(r.data || []))).catch(() => {});
    accountsApi.list().then(r => setAccounts(r.data || [])).catch(() => {});
  }, []);

  const flattenCategories = (tree) => {
    const result = [];
    const walk = (nodes) => nodes.forEach(n => { result.push(n); if (n.children) walk(n.children); });
    walk(tree);
    return result;
  };

  const fetchTxns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...filters };
      Object.keys(params).forEach(k => { if (!params[k] && params[k] !== 0) delete params[k]; });
      const res = await transactionsApi.list(params);
      setTxns(res.data || []);
      if (res.meta?.pagination) setPagination(res.meta.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTxns(1); }, [fetchTxns]);

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await transactionsApi.update(editingId, form);
        toast.success('Transaction updated');
      } else {
        await transactionsApi.create({ ...form, amount: parseFloat(form.amount) });
        toast.success('Transaction created');
      }
      setShowAddModal(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchTxns(pagination.page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionsApi.delete(id);
      toast.success('Deleted');
      fetchTxns(pagination.page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (row) => {
    setForm({
      account_id: row.account_id || '',
      category_id: row.category_id || '',
      type: row.type,
      amount: row.amount,
      description: row.description || '',
      merchant_name: row.merchant_name || '',
      transaction_date: row.transaction_date,
      notes: row.notes || '',
      tags: row.tags || [],
    });
    setEditingId(row.id);
    setShowAddModal(true);
  };

  const handleExport = async (format) => {
    try {
      const params = { format, ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      if (format === 'csv') {
        const res = await transactionsApi.export(params);
        const url = URL.createObjectURL(res);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const res = await transactionsApi.export(params);
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.json';
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success('Export complete');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // --- Import handlers ---
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'qif'].includes(ext)) {
      toast.error('Please upload a CSV or QIF file');
      return;
    }

    try {
      const res = await transactionsApi.importPreview(file);
      setImportPreview(res.data);
      const mappings = {};
      Object.entries(res.data.detectedMappings || {}).forEach(([header, field]) => {
        if (field) mappings[header] = field;
      });
      setImportMappings(mappings);
      setImportAccountId('');
      setImportCategoryId('');
      setImportStep('mapping');
    } catch (err) {
      toast.error(err.message || 'Failed to parse file');
    }
  };

  const handleImportConfirm = async () => {
    if (!importAccountId) {
      toast.error('Please select an account');
      return;
    }
    if (!importPreview?.rows?.length) return;

    setImporting(true);
    try {
      const res = await transactionsApi.importConfirm({
        rows: importPreview.rows,
        mappings: importMappings,
        accountId: importAccountId,
        categoryId: importCategoryId || undefined,
      });
      setImportResult(res.data);
      setImportStep('done');
      fetchTxns(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => {
    setShowImportModal(false);
    setImportStep('upload');
    setImportPreview(null);
    setImportMappings({});
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const columns = [
    { key: 'transaction_date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'description', label: 'Description', render: (v, r) => v || r.merchant_name || '—' },
    { key: 'category_name', label: 'Category', render: (v) => v ? <span className="text-gray-300">{v}</span> : <span className="text-gray-500">—</span> },
    {
      key: 'type', label: 'Type',
      render: (v) => <Badge color={v === 'income' ? 'green' : v === 'expense' ? 'red' : 'blue'}>{v}</Badge>,
    },
    {
      key: 'amount', label: 'Amount',
      render: (v, r) => (
        <span className={`font-medium ${r.type === 'income' ? 'text-income' : 'text-expense'}`}>
          {r.type === 'income' ? '+' : '-'}${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    { key: 'account_name', label: 'Account', render: (v) => v || '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(row)} className="text-gray-400 hover:text-accent text-xs">Edit</button>
          <button onClick={() => handleDelete(row.id)} className="text-gray-400 hover:text-expense text-xs">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transactions"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={() => setShowFilters(!showFilters)}>
              <FaFilter /> Filters
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => handleExport('csv')}>
              <FaDownload /> Export
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => setShowImportModal(true)}>
              <FaUpload /> Import
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => { setForm(emptyForm); setEditingId(null); setShowAddModal(true); }}>
              <FaPlus /> Add
            </button>
          </div>
        }
      />

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="input pl-9" placeholder="Search..." value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={filters.categoryId} onChange={(e) => setFilters(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Account</label>
            <select className="input" value={filters.accountId} onChange={(e) => setFilters(f => ({ ...f, accountId: e.target.value }))}>
              <option value="">All</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={filters.startDate} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={filters.endDate} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Amount Min</label>
            <input type="number" step="0.01" className="input" placeholder="0" value={filters.minAmount} onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value }))} />
          </div>
          <div>
            <label className="label">Amount Max</label>
            <input type="number" step="0.01" className="input" placeholder="1000" value={filters.maxAmount} onChange={(e) => setFilters(f => ({ ...f, maxAmount: e.target.value }))} />
          </div>
          <div>
            <label className="label">Merchant</label>
            <input className="input" placeholder="Store name..." value={filters.merchant} onChange={(e) => setFilters(f => ({ ...f, merchant: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? <LoadingSpinner /> : (
          <>
            <DataTable columns={columns} data={txns} />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-navy-700">
              <span className="text-sm text-gray-400">
                {pagination.total} transactions, page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchTxns(pagination.page - 1)}
                >Previous</button>
                <button
                  className="btn-secondary text-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchTxns(pagination.page + 1)}
                >Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditingId(null); }} title={editingId ? 'Edit Transaction' : 'Add Transaction'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="What was this for?" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Merchant</label>
            <input className="input" placeholder="Store or vendor name" value={form.merchant_name} onChange={(e) => setForm(f => ({ ...f, merchant_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.transaction_date} onChange={(e) => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {categories.filter(c => c.type === form.type || form.type === 'transfer').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Account</label>
            <select className="input" value={form.account_id} onChange={(e) => setForm(f => ({ ...f, account_id: e.target.value }))}>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingId(null); }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit}>{editingId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImportModal} onClose={closeImport} title="Import Transactions">
        <div className="space-y-4">
          {/* Step: Upload */}
          {importStep === 'upload' && (
            <div className="text-center py-8">
              <FaFileAlt className="mx-auto text-4xl text-gray-500 mb-4" />
              <p className="text-gray-300 mb-4">Upload a CSV or QIF bank statement</p>
              <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                <FaUpload /> Choose File
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.qif"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {/* Step: Column Mapping */}
          {importStep === 'mapping' && importPreview && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  {importPreview.totalRows} rows in {importPreview.fileName}
                </span>
                <Badge color="blue">{importPreview.fileType.toUpperCase()}</Badge>
              </div>

              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-gray-300">Map columns to fields</h3>
                {importPreview.headers.map(header => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-1/3 truncate" title={header}>{header}</span>
                    <select
                      className="input flex-1"
                      value={importMappings[header] || ''}
                      onChange={(e) => setImportMappings(m => ({ ...m, [header]: e.target.value }))}
                    >
                      <option value="">— Skip —</option>
                      {IMPORT_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-navy-700 pt-4">
                <h3 className="text-sm font-medium text-gray-300">Import settings</h3>
                <div>
                  <label className="label">Account *</label>
                  <select className="input" value={importAccountId} onChange={(e) => setImportAccountId(e.target.value)}>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Default Category (optional)</label>
                  <select className="input" value={importCategoryId} onChange={(e) => setImportCategoryId(e.target.value)}>
                    <option value="">No default</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 border-t border-navy-700 pt-4">
                <h3 className="text-sm font-medium text-gray-300">Preview (first rows)</h3>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-navy-700">
                        {importPreview.headers.map(h => (
                          <th key={h} className="text-left p-2 text-gray-400 font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-navy-800">
                          {importPreview.headers.map(h => (
                            <td key={h} className="p-2 text-gray-300 max-w-[150px] truncate">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-secondary" onClick={closeImport}>Cancel</button>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={handleImportConfirm}
                  disabled={!importAccountId || importing}
                >
                  {importing ? 'Importing...' : 'Import All Rows'}
                </button>
              </div>
            </>
          )}

          {/* Step: Done */}
          {importStep === 'done' && importResult && (
            <div className="text-center py-6">
              <FaCheck className="mx-auto text-4xl text-income mb-4" />
              <h3 className="text-lg font-medium text-gray-200 mb-2">Import Complete</h3>
              <p className="text-income text-2xl font-bold mb-1">{importResult.imported} transactions imported</p>
              {importResult.skipped > 0 && (
                <p className="text-expense text-sm mb-4">{importResult.skipped} rows skipped</p>
              )}
              {importResult.errors?.length > 0 && (
                <div className="mt-4 text-left max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-400 mb-1">Errors:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-expense">Row {err.row}: {err.error}</p>
                  ))}
                </div>
              )}
              <button className="btn-primary mt-4" onClick={closeImport}>Done</button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
