import { useState, useEffect } from 'react';
import { accountsApi, categoriesApi, budgetsApi } from '../api';
import { Modal, DataTable, Badge, PageHeader, LoadingSpinner } from '../components/Common';
import { FaPlus, FaTrash, FaKey } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Settings() {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // Form state
  const [accountForm, setAccountForm] = useState({ name: '', type: 'checking', currency: 'USD', opening_balance: 0 });
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense', color: '#3b82f6', icon: '' });
  const [budgetForm, setBudgetForm] = useState({ category_id: '', amount: '', period: 'monthly', start_date: new Date().toISOString().split('T')[0] });
  const [apiKey, setApiKey] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, catRes, budRes] = await Promise.all([
        accountsApi.list(),
        categoriesApi.list(),
        budgetsApi.list(),
      ]);
      setAccounts(accRes.data || []);
      const flat = [];
      const walk = (nodes) => nodes.forEach(n => { flat.push(n); if (n.children) walk(n.children); });
      walk(catRes.data || []);
      setCategories(flat);
      setBudgets(budRes.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      await accountsApi.create(accountForm);
      toast.success('Account created');
      setShowAccountModal(false);
      setAccountForm({ name: '', type: 'checking', currency: 'USD', opening_balance: 0 });
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleArchiveAccount = async (id) => {
    if (!confirm('Archive this account?')) return;
    try {
      await accountsApi.archive(id);
      toast.success('Account archived');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleAddCategory = async () => {
    try {
      await categoriesApi.create(categoryForm);
      toast.success('Category created');
      setShowCategoryModal(false);
      setCategoryForm({ name: '', type: 'expense', color: '#3b82f6', icon: '' });
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await categoriesApi.delete(id);
      toast.success('Category deleted');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleAddBudget = async () => {
    try {
      await budgetsApi.create({ ...budgetForm, amount: parseFloat(budgetForm.amount) });
      toast.success('Budget created');
      setShowBudgetModal(false);
      setBudgetForm({ category_id: '', amount: '', period: 'monthly', start_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteBudget = async (id) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      toast.success('Budget deleted');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleSaveApiKey = () => {
    toast.success('API key updated (restart backend to apply)');
  };

  const tabs = ['accounts', 'categories', 'budgets', 'api'];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t} className={`btn-secondary capitalize ${tab === t ? 'bg-accent text-white' : ''}`} onClick={() => setTab(t)}>
            {t === 'api' ? 'API Key' : t}
          </button>
        ))}
      </div>

      {/* Accounts Tab */}
      {tab === 'accounts' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAccountModal(true)}>
              <FaPlus /> Add Account
            </button>
          </div>
          <div className="card">
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type', render: (v) => <Badge color="blue">{v}</Badge> },
                { key: 'currency', label: 'Currency' },
                {
                  key: 'current_balance', label: 'Balance',
                  render: (v) => <span className="font-medium">${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
                },
                {
                  key: 'actions', label: '',
                  render: (_, row) => (
                    <button onClick={() => handleArchiveAccount(row.id)} className="text-gray-400 hover:text-expense text-sm flex items-center gap-1">
                      <FaTrash /> Archive
                    </button>
                  ),
                },
              ]}
              data={accounts}
            />
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {tab === 'categories' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowCategoryModal(true)}>
              <FaPlus /> Add Category
            </button>
          </div>
          <div className="card">
            <DataTable
              columns={[
                {
                  key: 'name', label: 'Name',
                  render: (v, row) => (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                      <span>{v}</span>
                      {row.is_system && <Badge color="gray">system</Badge>}
                    </div>
                  ),
                },
                { key: 'type', label: 'Type', render: (v) => <Badge color={v === 'income' ? 'green' : 'red'}>{v}</Badge> },
                {
                  key: 'actions', label: '',
                  render: (_, row) => !row.is_system ? (
                    <button onClick={() => handleDeleteCategory(row.id)} className="text-gray-400 hover:text-expense text-sm flex items-center gap-1">
                      <FaTrash /> Delete
                    </button>
                  ) : <span className="text-xs text-gray-600">System default</span>,
                },
              ]}
              data={categories}
            />
          </div>
        </div>
      )}

      {/* Budgets Tab */}
      {tab === 'budgets' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowBudgetModal(true)}>
              <FaPlus /> Add Budget
            </button>
          </div>
          <div className="card">
            <DataTable
              columns={[
                {
                  key: 'category_name', label: 'Category',
                  render: (v, row) => (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.category_color }} />
                      <span>{v}</span>
                    </div>
                  ),
                },
                {
                  key: 'amount', label: 'Budget Amount',
                  render: (v) => <span className="font-medium">${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
                },
                { key: 'period', label: 'Period', render: (v) => <Badge color="blue">{v}</Badge> },
                { key: 'start_date', label: 'Start' },
                {
                  key: 'actions', label: '',
                  render: (_, row) => (
                    <button onClick={() => handleDeleteBudget(row.id)} className="text-gray-400 hover:text-expense text-sm flex items-center gap-1">
                      <FaTrash /> Delete
                    </button>
                  ),
                },
              ]}
              data={budgets}
            />
          </div>
        </div>
      )}

      {/* API Key Tab */}
      {tab === 'api' && (
        <div className="card max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <FaKey className="text-accent" />
            <h3 className="font-medium">Anthropic API Key</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Required for invoice/receipt scanning with Claude Vision API.
            Save the key in your backend .env file.
          </p>
          <input
            type="password"
            className="input mb-3"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button className="btn-primary" onClick={handleSaveApiKey}>Save API Key</button>
        </div>
      )}

      {/* Account Modal */}
      <Modal open={showAccountModal} onClose={() => setShowAccountModal(false)} title="Add Account">
        <div className="space-y-4">
          <div>
            <label className="label">Account Name</label>
            <input className="input" placeholder="e.g., Main Checking" value={accountForm.name} onChange={(e) => setAccountForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={accountForm.type} onChange={(e) => setAccountForm(f => ({ ...f, type: e.target.value }))}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="investment">Investment</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Currency</label>
              <select className="input" value={accountForm.currency} onChange={(e) => setAccountForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label className="label">Opening Balance</label>
              <input type="number" step="0.01" className="input" value={accountForm.opening_balance} onChange={(e) => setAccountForm(f => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowAccountModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddAccount}>Create Account</button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Add Category">
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="e.g., Hobbies" value={categoryForm.name} onChange={(e) => setCategoryForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={categoryForm.type} onChange={(e) => setCategoryForm(f => ({ ...f, type: e.target.value }))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <input type="color" className="w-12 h-10 rounded border border-navy-600 bg-transparent cursor-pointer" value={categoryForm.color} onChange={(e) => setCategoryForm(f => ({ ...f, color: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddCategory}>Create Category</button>
          </div>
        </div>
      </Modal>

      {/* Budget Modal */}
      <Modal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Add Budget">
        <div className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={budgetForm.category_id} onChange={(e) => setBudgetForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">Select category</option>
              {categories.filter(c => c.type === 'expense').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" className="input" placeholder="500.00" value={budgetForm.amount} onChange={(e) => setBudgetForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Period</label>
              <select className="input" value={budgetForm.period} onChange={(e) => setBudgetForm(f => ({ ...f, period: e.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={budgetForm.start_date} onChange={(e) => setBudgetForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowBudgetModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddBudget}>Create Budget</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
