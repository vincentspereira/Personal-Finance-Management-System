import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, transactionsApi, budgetsApi, savingsGoalsApi, recurringApi } from '../api';
import { KPICard, DataTable, LoadingSpinner, Badge, PageHeader, Modal } from '../components/Common';
import { IncomeExpenseBarChart, ExpenseDonutChart, CashflowAreaChart } from '../components/Charts';
import { FaWallet, FaArrowDown, FaPiggyBank, FaShoppingCart, FaPlus, FaExclamationTriangle, FaRedo, FaBullseye } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recentTxns, setRecentTxns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [netWorth, setNetWorth] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: '', target_amount: '', current_amount: '', target_date: '', color: '#3b82f6' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = now.toISOString().split('T')[0];

      try {
        const [summaryRes, trendsRes, catRes, cashflowRes, budgetsRes, txnsRes, alertsRes, billsRes, goalsRes, netWorthRes] = await Promise.all([
          analyticsApi.summary({ startDate: start, endDate: end }),
          analyticsApi.trends({ months: 12 }),
          analyticsApi.byCategory({ startDate: start, endDate: end, type: 'expense' }),
          analyticsApi.cashflow({ startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], endDate: end }),
          budgetsApi.list(),
          transactionsApi.list({ limit: 10 }),
          analyticsApi.budgetAlerts().catch(() => ({ data: [] })),
          recurringApi.upcoming(30).catch(() => ({ data: [] })),
          savingsGoalsApi.list().catch(() => ({ data: [] })),
          analyticsApi.netWorth().catch(() => ({ data: null })),
        ]);

        setSummary(summaryRes.data);
        setTrends(trendsRes.data || []);
        setByCategory(catRes.data || []);
        setCashflow(cashflowRes.data || []);
        setBudgets(budgetsRes.data || []);
        setRecentTxns(txnsRes.data || []);
        setAlerts(alertsRes.data || []);
        setUpcomingBills(billsRes.data || []);
        setGoals(goalsRes.data || []);
        setNetWorth(netWorthRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateGoal = async () => {
    try {
      await savingsGoalsApi.create({
        ...goalForm,
        target_amount: parseFloat(goalForm.target_amount),
        current_amount: parseFloat(goalForm.current_amount) || 0,
      });
      const res = await savingsGoalsApi.list();
      setGoals(res.data || []);
      setShowGoalModal(false);
      setGoalForm({ name: '', target_amount: '', current_amount: '', target_date: '', color: '#3b82f6' });
      toast.success('Goal created');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  const topCategory = byCategory.length > 0 ? byCategory[0].name : 'N/A';

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/transactions')}>
            <FaPlus /> Add Transaction
          </button>
        }
      />

      {/* Budget Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map(alert => (
            <div key={alert.budget_id} className={`card flex items-center gap-3 ${alert.alert_type === 'exceeded' ? 'border-expense' : 'border-yellow-500'}`}>
              <FaExclamationTriangle className={alert.alert_type === 'exceeded' ? 'text-expense' : 'text-yellow-500'} />
              <div className="flex-1">
                <span className="text-sm font-medium">{alert.category_name}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {alert.percentage}% of budget used (${alert.actual_spent.toFixed(0)} / ${alert.budget_amount.toFixed(0)})
                </span>
              </div>
              {alert.alert_type === 'warning' && (
                <span className="text-xs text-gray-400">${alert.daily_budget_remaining.toFixed(0)}/day remaining</span>
              )}
              {alert.alert_type === 'exceeded' && <Badge color="red">Over budget</Badge>}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Income" value={summary?.total_income || 0} change={summary?.income_change} icon={FaWallet} color="income" />
        <KPICard title="Total Expenses" value={summary?.total_expense || 0} change={summary?.expense_change} icon={FaArrowDown} color="expense" />
        <KPICard title="Net Savings" value={summary?.net || 0} suffix={` (${summary?.savings_rate || 0}%)`} icon={FaPiggyBank} color="accent" />
        <KPICard title="Top Category" value={0} prefix="" suffix={topCategory} icon={FaShoppingCart} />
      </div>

      {/* Upcoming Bills */}
      {upcomingBills.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Upcoming Bills (30 days)</h3>
            <button className="text-xs text-accent hover:underline" onClick={() => navigate('/analytics')}>
              View all recurring
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingBills.slice(0, 6).map(bill => (
              <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div>
                  <p className="text-sm font-medium">{bill.description || bill.merchant_name}</p>
                  <p className="text-xs text-gray-400">{new Date(bill.next_predicted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {bill.frequency}</p>
                </div>
                <span className="font-medium text-expense">${parseFloat(bill.avg_amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Income vs Expenses (12 Months)</h3>
          <IncomeExpenseBarChart data={trends} />
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Expense Breakdown</h3>
          {byCategory.length > 0 ? (
            <ExpenseDonutChart data={byCategory.map(c => ({ name: c.name, total: parseFloat(c.total) }))} />
          ) : (
            <p className="text-gray-500 text-center py-12">No expense data this month</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Daily Cashflow (30 Days)</h3>
          <CashflowAreaChart data={cashflow.map(c => ({
            date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            income: parseFloat(c.income),
            expense: parseFloat(c.expense),
          }))} />
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Budget Progress</h3>
          {budgets.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No budgets set. Go to Budgets to create one.</p>
          ) : (
            <div className="space-y-3">
              {budgets.slice(0, 6).map((b) => {
                const spent = parseFloat(b.actual_spent || 0);
                const budget = parseFloat(b.amount);
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const over = spent > budget;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{b.category_name}</span>
                      <span className={over ? 'text-expense' : 'text-gray-400'}>
                        ${spent.toFixed(0)} / ${budget.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-navy-900 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${over ? 'bg-expense' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Savings Goals */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400">Savings Goals</h3>
          <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setShowGoalModal(true)}>
            <FaPlus /> Add Goal
          </button>
        </div>
        {goals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No savings goals yet. Create one to start tracking!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
              const isComplete = pct >= 100;
              return (
                <div key={goal.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <FaBullseye style={{ color: goal.color }} />
                    <span className="font-medium text-sm">{goal.name}</span>
                    {isComplete && <Badge color="green">Done</Badge>}
                  </div>
                  <div className="text-lg font-bold mb-1">${parseFloat(goal.current_amount).toLocaleString()} <span className="text-sm text-gray-400 font-normal">/ ${parseFloat(goal.target_amount).toLocaleString()}</span></div>
                  <div className="w-full bg-navy-900 rounded-full h-2 mb-1">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{pct.toFixed(0)}%</span>
                    {goal.target_date && <span>Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Transactions</h3>
        <DataTable
          columns={[
            { key: 'transaction_date', label: 'Date' },
            { key: 'description', label: 'Description' },
            { key: 'category_name', label: 'Category', render: (val) => val || <span className="text-gray-500">—</span> },
            { key: 'type', label: 'Type', render: (val) => <Badge color={val === 'income' ? 'green' : val === 'expense' ? 'red' : 'blue'}>{val}</Badge> },
            { key: 'amount', label: 'Amount', render: (val, row) => (
              <span className={row.type === 'income' ? 'text-income' : 'text-expense'}>
                {row.type === 'income' ? '+' : '-'}${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )},
          ]}
          data={recentTxns}
          onRowClick={() => navigate('/transactions')}
          emptyMessage="No transactions yet. Add your first one!"
        />
      </div>

      {/* Create Goal Modal */}
      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title="Create Savings Goal">
        <div className="space-y-4">
          <div>
            <label className="label">Goal Name</label>
            <input className="input" placeholder="e.g. Emergency Fund" value={goalForm.name} onChange={(e) => setGoalForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Amount</label>
              <input type="number" step="0.01" className="input" placeholder="10000" value={goalForm.target_amount} onChange={(e) => setGoalForm(f => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Current Amount</label>
              <input type="number" step="0.01" className="input" placeholder="0" value={goalForm.current_amount} onChange={(e) => setGoalForm(f => ({ ...f, current_amount: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Date</label>
              <input type="date" className="input" value={goalForm.target_date} onChange={(e) => setGoalForm(f => ({ ...f, target_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="color" className="input h-10 p-1" value={goalForm.color} onChange={(e) => setGoalForm(f => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowGoalModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreateGoal} disabled={!goalForm.name || !goalForm.target_amount}>Create Goal</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
