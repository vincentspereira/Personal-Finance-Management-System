import { useState, useEffect } from 'react';
import { savingsGoalsApi } from '../api';
import { Modal, PageHeader, LoadingSpinner, Badge } from '../components/Common';
import { FaPlus, FaEdit, FaTrash, FaBullseye, FaHandHoldingUsd } from 'react-icons/fa';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'];

const emptyForm = { name: '', target_amount: '', current_amount: '0', target_date: '', color: '#3b82f6' };

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [editId, setEditId] = useState(null);
  const [contributeId, setContributeId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await savingsGoalsApi.list();
      setGoals(res.data || []);
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
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0,
      };
      if (editId) {
        await savingsGoalsApi.update(editId, data);
        toast.success('Goal updated');
      } else {
        await savingsGoalsApi.create(data);
        toast.success('Goal created');
      }
      setShowModal(false);
      setEditId(null);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleContribute = async () => {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) return;

    try {
      const goal = goals.find(g => g.id === contributeId);
      if (!goal) return;
      const newAmount = parseFloat(goal.current_amount) + amount;
      const isCompleted = newAmount >= parseFloat(goal.target_amount);

      await savingsGoalsApi.update(contributeId, {
        current_amount: newAmount,
        is_completed: isCompleted,
      });

      toast.success(isCompleted ? 'Goal completed!' : `+$${amount.toFixed(2)} added`);
      setShowContribute(false);
      setContributeId(null);
      setContributeAmount('');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (goal) => {
    setEditId(goal.id);
    setForm({
      name: goal.name,
      target_amount: goal.target_amount?.toString() || '',
      current_amount: goal.current_amount?.toString() || '0',
      target_date: goal.target_date?.split('T')[0] || '',
      color: goal.color || '#3b82f6',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this savings goal?')) return;
    try {
      await savingsGoalsApi.delete(id);
      toast.success('Goal deleted');
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

  const openContribute = (id) => {
    setContributeId(id);
    setContributeAmount('');
    setShowContribute(true);
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Savings Goals" actions={
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <FaPlus /> New Goal
        </button>
      } />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total Saved</p>
          <p className="text-2xl font-bold text-income">${fmt(totalSaved)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total Target</p>
          <p className="text-2xl font-bold">${fmt(totalTarget)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Overall Progress</p>
          <p className="text-2xl font-bold">{totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%</p>
          {totalTarget > 0 && (
            <div className="w-full h-2 bg-navy-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Goal Cards */}
      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">No savings goals yet. Create one to start tracking!</p>
          <button className="btn-primary" onClick={openCreate}>Create Your First Goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const current = parseFloat(goal.current_amount || 0);
            const target = parseFloat(goal.target_amount || 1);
            const pct = Math.min(Math.round((current / target) * 100), 100);
            const remaining = target - current;
            const isComplete = pct >= 100;
            const hasDeadline = goal.target_date;
            const daysLeft = hasDeadline
              ? Math.ceil((new Date(goal.target_date) - new Date()) / 86400000)
              : null;

            return (
              <div key={goal.id} className={`card ${isComplete ? 'border-income/30' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${goal.color}20` }}>
                      <FaBullseye style={{ color: goal.color }} className="text-lg" />
                    </div>
                    <div>
                      <h3 className="font-medium">{goal.name}</h3>
                      {isComplete && <Badge color="green">Completed</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openContribute(goal.id)} className="text-gray-400 hover:text-income text-sm" title="Add funds">
                      <FaHandHoldingUsd />
                    </button>
                    <button onClick={() => handleEdit(goal)} className="text-gray-400 hover:text-accent text-sm">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="text-gray-400 hover:text-expense text-sm">
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">${fmt(current)}</span>
                    <span className="text-gray-400">of ${fmt(target)}</span>
                  </div>
                  <div className="w-full h-3 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{pct}% complete</span>
                    {!isComplete && <span>${fmt(remaining)} remaining</span>}
                  </div>
                </div>

                {hasDeadline && !isComplete && (
                  <div className={`text-xs ${daysLeft !== null && daysLeft < 30 ? 'text-yellow-500' : 'text-gray-500'}`}>
                    Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {daysLeft !== null && (
                      <span className="ml-1">
                        ({daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`})
                      </span>
                    )}
                  </div>
                )}

                {!isComplete && hasDeadline && daysLeft > 0 && remaining > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Need ${fmt(remaining / daysLeft)}/day to reach goal
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(null); }} title={editId ? 'Edit Goal' : 'New Savings Goal'}>
        <div className="space-y-4">
          <div>
            <label className="label">Goal Name</label>
            <input
              className="input"
              placeholder="e.g. Emergency Fund, Vacation"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Amount</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="10000.00"
                value={form.target_amount}
                onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Current Amount</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="0"
                value={form.current_amount}
                onChange={(e) => setForm(f => ({ ...f, current_amount: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Target Date (optional)</label>
            <input
              type="date"
              className="input"
              value={form.target_date}
              onChange={(e) => setForm(f => ({ ...f, target_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={!form.name || !form.target_amount}>
              {editId ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Contribute Modal */}
      <Modal open={showContribute} onClose={() => { setShowContribute(false); setContributeId(null); }} title="Add Funds">
        <div className="space-y-4">
          <div>
            <label className="label">Amount to Add</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="100.00"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => { setShowContribute(false); setContributeId(null); }}>Cancel</button>
            <button className="btn-primary" onClick={handleContribute} disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}>
              Add Funds
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
