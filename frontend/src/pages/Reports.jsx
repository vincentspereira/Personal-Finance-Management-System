import { useState, useEffect } from 'react';
import { reportsApi, analyticsApi } from '../api';
import { PageHeader, LoadingSpinner, KPICard } from '../components/Common';
import { IncomeExpenseBarChart } from '../components/Charts';
import { FaFilePdf, FaCalendar } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Reports() {
  const [tab, setTab] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [netWorth, setNetWorth] = useState(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    loadNetWorth();
  }, []);

  useEffect(() => {
    if (tab === 'monthly') loadMonthly();
    else if (tab === 'annual') loadAnnual();
  }, [month, year, tab]);

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.monthly({ year, month });
      setReport(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnual = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.annual({ year });
      setReport(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNetWorth = async () => {
    try {
      const res = await reportsApi.netWorth();
      setNetWorth(res.data);
    } catch {}
  };

  const handlePrint = () => window.print();

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div>
      <PageHeader
        title="Reports"
        actions={
          <button className="btn-secondary flex items-center gap-2" onClick={handlePrint}>
            <FaFilePdf /> Export PDF
          </button>
        }
      />

      <div className="flex gap-2 mb-6 no-print">
        <button className={`btn-secondary ${tab === 'monthly' ? 'bg-accent text-white' : ''}`} onClick={() => setTab('monthly')}>Monthly</button>
        <button className={`btn-secondary ${tab === 'annual' ? 'bg-accent text-white' : ''}`} onClick={() => setTab('annual')}>Annual</button>
        <button className={`btn-secondary ${tab === 'networth' ? 'bg-accent text-white' : ''}`} onClick={() => setTab('networth')}>Net Worth</button>
      </div>

      {tab !== 'networth' && (
        <div className="flex gap-4 mb-6 no-print">
          <select className="input w-40" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          {tab === 'networth' ? (
            <div>
              <div className="card mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Net Worth</h3>
                <div className="text-3xl font-bold text-income">
                  ${netWorth ? Number(netWorth.total_net_worth).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {netWorth?.accounts?.map((acc) => (
                  <div key={acc.id} className="card">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">{acc.name}</span>
                      <span className="text-xs text-gray-500">{acc.type}</span>
                    </div>
                    <div className={`text-xl font-bold mt-1 ${acc.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                      ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard title="Income" value={report.summary?.total_income || 0} color="income" />
                <KPICard title="Expenses" value={report.summary?.total_expense || 0} color="expense" />
                <KPICard title="Net" value={report.summary?.net || 0} color="accent" />
              </div>

              {/* Category Breakdown */}
              {report.categories && report.categories.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Category Breakdown</h3>
                  <div className="space-y-2">
                    {report.categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between py-2 border-b border-navy-700/50">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm">{cat.name}</span>
                          <span className="text-xs text-gray-500">({cat.type})</span>
                        </div>
                        <span className="text-sm font-medium">${parseFloat(cat.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Annual Monthly Grid */}
              {tab === 'annual' && report.monthly_breakdown && (
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Month-by-Month Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-navy-700">
                          <th className="text-left py-2 px-3 text-gray-400">Month</th>
                          <th className="text-right py-2 px-3 text-income">Income</th>
                          <th className="text-right py-2 px-3 text-expense">Expenses</th>
                          <th className="text-right py-2 px-3 text-gray-400">Net</th>
                          <th className="text-right py-2 px-3 text-gray-400">Txns</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.monthly_breakdown.map((row) => (
                          <tr key={row.month} className="border-b border-navy-700/50">
                            <td className="py-2 px-3">{row.month}</td>
                            <td className="py-2 px-3 text-right text-income">${parseFloat(row.income).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-3 text-right text-expense">${parseFloat(row.expense).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-2 px-3 text-right font-medium ${parseFloat(row.net) >= 0 ? 'text-income' : 'text-expense'}`}>
                              ${parseFloat(row.net).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-400">{row.transaction_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Trends Chart */}
              {report.trends && report.trends.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">12-Month Trend</h3>
                  <IncomeExpenseBarChart data={report.trends} />
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">No data for this period</div>
          )}
        </>
      )}
    </div>
  );
}
