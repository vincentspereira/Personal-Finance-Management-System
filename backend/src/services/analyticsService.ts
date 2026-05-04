import { query } from '../db';

export async function getSummary(userId: string, startDate: string, endDate: string) {
  const result = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3
  `, [userId, startDate, endDate]);

  const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - daysDiff);

  const prevResult = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM transactions
    WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3
  `, [userId, prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]]);

  const curr = result.rows[0];
  const prev = prevResult.rows[0];

  return {
    ...curr,
    savings_rate: parseFloat(curr.total_income) > 0
      ? Math.round((parseFloat(curr.net) / parseFloat(curr.total_income)) * 10000) / 100
      : 0,
    income_change: prev.total_income !== '0'
      ? Math.round(((parseFloat(curr.total_income) - parseFloat(prev.total_income)) / parseFloat(prev.total_income)) * 10000) / 100
      : null,
    expense_change: prev.total_expense !== '0'
      ? Math.round(((parseFloat(curr.total_expense) - parseFloat(prev.total_expense)) / parseFloat(prev.total_expense)) * 10000) / 100
      : null,
  };
}

export async function getByCategory(userId: string, startDate: string, endDate: string, type?: string) {
  const typeFilter = type ? `AND t.type = '${type}'` : '';
  const result = await query(`
    SELECT c.id, c.name, c.type, c.color, c.icon,
           SUM(t.amount) as total,
           COUNT(t.id) as transaction_count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2 AND $3 ${typeFilter}
    GROUP BY c.id, c.name, c.type, c.color, c.icon
    ORDER BY total DESC
  `, [userId, startDate, endDate]);
  return result.rows;
}

export async function getTrends(userId: string, months: number = 12) {
  const result = await query(`
    WITH months AS (
      SELECT to_char(generate_series(
        CURRENT_DATE - INTERVAL '${months - 1} months',
        CURRENT_DATE,
        INTERVAL '1 month'
      ), 'YYYY-MM') as month
    )
    SELECT m.month,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net
    FROM months m
    LEFT JOIN transactions t ON to_char(t.transaction_date, 'YYYY-MM') = m.month AND t.user_id = $1
    GROUP BY m.month
    ORDER BY m.month
  `, [userId]);
  return result.rows;
}

export async function getTopMerchants(userId: string, startDate: string, endDate: string, limit: number = 10) {
  const result = await query(`
    SELECT merchant_name, COUNT(*) as transaction_count, SUM(amount) as total_spent
    FROM transactions
    WHERE user_id = $1 AND type = 'expense' AND merchant_name IS NOT NULL
      AND transaction_date BETWEEN $2 AND $3
    GROUP BY merchant_name
    ORDER BY total_spent DESC
    LIMIT $4
  `, [userId, startDate, endDate, limit]);
  return result.rows;
}

export async function getCashflow(userId: string, startDate: string, endDate: string) {
  const result = await query(`
    SELECT transaction_date::date as date,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
    FROM transactions
    WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3
    GROUP BY transaction_date
    ORDER BY transaction_date
  `, [userId, startDate, endDate]);
  return result.rows;
}

export async function getBudgetVsActual(userId: string, startDate: string, endDate: string) {
  const result = await query(`
    SELECT b.id as budget_id, b.amount as budget_amount, b.period,
           c.id as category_id, c.name as category_name, c.color,
           COALESCE(SUM(t.amount), 0) as actual_spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.type = 'expense'
      AND t.user_id = $1
      AND t.transaction_date BETWEEN $2 AND $3
    WHERE b.user_id = $1 AND b.period = 'monthly'
      AND b.start_date <= $3
      AND (b.end_date IS NULL OR b.end_date >= $2)
    GROUP BY b.id, b.amount, b.period, c.id, c.name, c.color
    ORDER BY c.name
  `, [userId, startDate, endDate]);
  return result.rows;
}

export async function getRecurring(userId: string) {
  const result = await query(`
    SELECT description, merchant_name,
           AVG(amount) as avg_amount,
           COUNT(*) as occurrence_count,
           MIN(transaction_date) as first_occurrence,
           MAX(transaction_date) as last_occurrence,
           mode() WITHIN GROUP (ORDER BY category_id) as category_id
    FROM transactions
    WHERE user_id = $1 AND (is_recurring = true OR (description IS NOT NULL AND description != ''))
    GROUP BY description, merchant_name
    HAVING COUNT(*) >= 2
    ORDER BY occurrence_count DESC
    LIMIT 20
  `, [userId]);
  return result.rows;
}
