import { useState, useEffect } from 'react';
import { budgetsApi, categoriesApi, analyticsApi } from '../api';
import { Modal, PageHeader, LoadingSpinner } from '../components/Common';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [spending, setSpending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    period: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budRes, catRes, spendRes] = await Promise.all([
        budgetsApi.list(),
        categoriesApi.list(),
        analyticsApi.budgetVsActual({ period: 'monthly' }).catch(() => ({ data: [] })),
      ]);
      setBudgets(budRes.data || []);
      const flat = [];
      const walk = (nodes) => nodes.forEach(n => { flat.push(n); if (n.children) walk(n.children); });
      walk(catRes.data || []);
      setCategories(flat);
      setSpending(spendRes.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSpent = (budget) => {
    const match = spending.find(s => s.budget_id === budget.id || s.category_id === budget.category_id);
    return match ? parseFloat(match.actual || match.spent || 0) : 0;
  };

  const handleSubmit = async () => {
    try {
      const data = { ...form, amount: parseFloat(form.amount) };
      if (editId) {
        await budgetsApi.update(editId, data);
        toast.success('Budget updated');
      } else {
        await budgetsApi.create(data);
        toast.success('Budget created');
      }
      setShowModal(false);
      setEditId(null);
      setForm({ category_id: '', amount: '', period: 'monthly', start_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleEdit = (budget) => {
    setEditId(budget.id);
    setForm({
      category_id: budget.category_id,
      amount: budget.amount,
      period: budget.period,
      start_date: budget.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      toast.success('Budget deleted');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ category_id: '', amount: '', period: 'monthly', start_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Budgets" actions={
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <FaPlus /> Add Budget
        </button>
      } />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total Budget</p>
          <p className="text-2xl font-bold">${fmt(totalBudget)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total Spent</p>
          <p className={`text-2xl font-bold ${totalSpent > totalBudget ? 'text-expense' : 'text-income'}`}>
            ${fmt(totalSpent)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${(totalBudget - totalSpent) < 0 ? 'text-expense' : 'text-income'}`}>
            ${fmt(totalBudget - totalSpent)}
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      {totalBudget > 0 && (
        <div className="card mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Overall Spending</span>
            <span className={totalSpent > totalBudget ? 'text-expense' : 'text-gray-300'}>
              {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% used
            </span>
          </div>
          <div className="w-full h-3 bg-navy-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalSpent > totalBudget ? 'bg-expense' : totalSpent > totalBudget * 0.8 ? 'bg-yellow-500' : 'bg-income'}`}
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Budget Cards */}
      {budgets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">No budgets yet. Create one to start tracking your spending.</p>
          <button className="btn-primary" onClick={openCreate}>Create Your First Budget</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const spent = getSpent(budget);
            const amount = parseFloat(budget.amount || 0);
            const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
            const overBudget = spent > amount;
            const nearLimit = pct >= 80 && !overBudget;

            return (
              <div key={budget.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.category_color }} />
                    <h3 className="font-medium">{budget.category_name}</h3>
                    <span className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-navy-700 rounded">
                      {budget.period}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(budget)} className="text-gray-400 hover:text-accent text-sm">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="text-gray-400 hover:text-expense text-sm">
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">${fmt(spent)} of ${fmt(amount)}</span>
                  <span className={`flex items-center gap-1 ${overBudget ? 'text-expense' : nearLimit ? 'text-yellow-500' : 'text-income'}`}>
                    {overBudget ? <FaExclamationTriangle className="text-xs" /> : pct >= 100 ? <FaCheck className="text-xs" /> : null}
                    {pct}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overBudget ? 'bg-expense' : nearLimit ? 'bg-yellow-500' : 'bg-income'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {overBudget && (
                  <p className="text-xs text-expense mt-2">
                    Over budget by ${fmt(spent - amount)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? 'Edit Budget' : 'Add Budget'}>
        <div className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category_id}
              onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
              disabled={!!editId}
            >
              <option value="">Select category</option>
              {categories.filter(c => c.type === 'expense').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Budget Amount</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="500.00"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Period</label>
              <select className="input" value={form.period} onChange={(e) => setForm(f => ({ ...f, period: e.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              className="input"
              value={form.start_date}
              onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit}>
              {editId ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
