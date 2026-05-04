import { query } from '../db';
import { getSummary, getByCategory, getTrends, getTopMerchants, getCashflow } from './analyticsService';

export async function getMonthlyReport(userId: string, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];

  const [summary, categories, trends, merchants, cashflow] = await Promise.all([
    getSummary(userId, start, end),
    getByCategory(userId, start, end),
    getTrends(userId, 12),
    getTopMerchants(userId, start, end, 5),
    getCashflow(userId, start, end),
  ]);

  return { period: { start, end, year, month }, summary, categories, trends, merchants, cashflow };
}

export async function getAnnualReport(userId: string, year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const monthlyBreakdown = await query(`
    SELECT to_char(transaction_date, 'YYYY-MM') as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3
    GROUP BY to_char(transaction_date, 'YYYY-MM')
    ORDER BY month
  `, [userId, start, end]);

  const [summary, categories] = await Promise.all([
    getSummary(userId, start, end),
    getByCategory(userId, start, end),
  ]);

  return { period: { start, end, year }, summary, categories, monthly_breakdown: monthlyBreakdown.rows };
}

export async function getCustomReport(userId: string, startDate: string, endDate: string) {
  const [summary, categories, merchants, cashflow] = await Promise.all([
    getSummary(userId, startDate, endDate),
    getByCategory(userId, startDate, endDate),
    getTopMerchants(userId, startDate, endDate, 10),
    getCashflow(userId, startDate, endDate),
  ]);

  return { period: { start: startDate, end: endDate }, summary, categories, merchants, cashflow };
}

export async function getNetWorth(userId: string) {
  const result = await query(`
    SELECT a.id, a.name, a.type, a.opening_balance,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as transaction_balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    WHERE a.is_archived = false AND a.user_id = $1
    GROUP BY a.id
    ORDER BY a.name
  `, [userId]);

  const accounts = result.rows.map((r: any) => ({
    ...r,
    balance: parseFloat(r.opening_balance) + parseFloat(r.transaction_balance),
  }));

  const total = accounts.reduce((sum: number, a: any) => sum + a.balance, 0);
  return { accounts, total_net_worth: total };
}
