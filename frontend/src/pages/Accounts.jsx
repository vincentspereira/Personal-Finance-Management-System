import { useState, useEffect } from 'react';
import { accountsApi } from '../api';
import { Modal, PageHeader, LoadingSpinner, Badge } from '../components/Common';
import { FaPlus, FaEdit, FaArchive, FaUniversity, FaCreditCard, FaWallet, FaMoneyBillWave, FaChartLine } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', icon: FaUniversity },
  { value: 'savings', label: 'Savings', icon: FaWallet },
  { value: 'credit', label: 'Credit Card', icon: FaCreditCard },
  { value: 'cash', label: 'Cash', icon: FaMoneyBillWave },
  { value: 'investment', label: 'Investment', icon: FaChartLine },
];

function getTypeIcon(type) {
  const found = ACCOUNT_TYPES.find(t => t.value === type);
  return found ? found.icon : FaUniversity;
}

const emptyForm = {
  name: '',
  type: 'checking',
  currency: 'USD',
  opening_balance: '',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await accountsApi.list();
      setAccounts(res.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...form,
        opening_balance: parseFloat(form.opening_balance) || 0,
      };
      if (editId) {
        await accountsApi.update(editId, data);
        toast.success('Account updated');
      } else {
        await accountsApi.create(data);
        toast.success('Account created');
      }
      setShowModal(false);
      setEditId(null);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (account) => {
    setEditId(account.id);
    setForm({
      name: account.name,
      type: account.type,
      currency: account.currency || 'USD',
      opening_balance: account.opening_balance?.toString() || '0',
    });
    setShowModal(true);
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this account? It will be hidden but not deleted.')) return;
    try {
      await accountsApi.archive(id);
      toast.success('Account archived');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.current_balance || a.opening_balance || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Accounts" actions={
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <FaPlus /> Add Account
        </button>
      } />

      {/* Summary */}
      <div className="card mb-6">
        <p className="text-sm text-gray-400 mb-1">Total Balance Across All Accounts</p>
        <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-income' : 'text-expense'}`}>
          ${fmt(totalBalance)}
        </p>
      </div>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">No accounts yet. Add one to start tracking your finances.</p>
          <button className="btn-primary" onClick={openCreate}>Add Your First Account</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const balance = parseFloat(account.current_balance || account.opening_balance || 0);
            const Icon = getTypeIcon(account.type);
            const isCredit = account.type === 'credit';

            return (
              <div key={account.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Icon className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium">{account.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge color="gray">{account.type}</Badge>
                        <span className="text-xs text-gray-500 uppercase">{account.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(account)} className="text-gray-400 hover:text-accent text-sm">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleArchive(account.id)} className="text-gray-400 hover:text-expense text-sm">
                      <FaArchive />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-400">Current Balance</p>
                  <p className={`text-2xl font-bold ${isCredit ? (balance < 0 ? 'text-income' : 'text-expense') : (balance >= 0 ? 'text-income' : 'text-expense')}`}>
                    ${fmt(Math.abs(balance))}
                    {isCredit && balance > 0 && <span className="text-xs text-gray-400 ml-1">owed</span>}
                  </p>
                </div>

                {parseFloat(account.opening_balance) !== 0 && (
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Opening: ${fmt(account.opening_balance)}</span>
                    <span>Change: ${fmt(balance - parseFloat(account.opening_balance))}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? 'Edit Account' : 'Add Account'}>
        <div className="space-y-4">
          <div>
            <label className="label">Account Name</label>
            <input
              className="input"
              placeholder="e.g. Main Checking"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Account Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {ACCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                className="input"
                value={form.currency}
                onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Opening Balance</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="0.00"
              value={form.opening_balance}
              onChange={(e) => setForm(f => ({ ...f, opening_balance: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={!form.name}>
              {editId ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
