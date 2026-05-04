import { query } from '../db';

export async function listAccounts(userId: string) {
  const result = await query(`
    SELECT a.*,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) +
      a.opening_balance as current_balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    WHERE a.is_archived = false AND a.user_id = $1
    GROUP BY a.id
    ORDER BY a.name
  `, [userId]);
  return result.rows;
}

export async function getAccount(id: string, userId: string) {
  const result = await query(`
    SELECT a.*,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) +
      a.opening_balance as current_balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    WHERE a.id = $1 AND a.user_id = $2
    GROUP BY a.id
  `, [id, userId]);
  return result.rows[0] || null;
}

export async function createAccount(userId: string, data: {
  name: string;
  type: string;
  currency?: string;
  opening_balance?: number;
}) {
  const result = await query(
    `INSERT INTO accounts (user_id, name, type, currency, opening_balance)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, data.name, data.type, data.currency || 'USD', data.opening_balance || 0]
  );
  return result.rows[0];
}

export async function updateAccount(id: string, userId: string, data: {
  name?: string;
  type?: string;
  currency?: string;
  opening_balance?: number;
}) {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (fields.length === 0) return null;
  fields.push('updated_at = NOW()');
  params.push(id, userId);

  const result = await query(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    params
  );
  return result.rows[0];
}

export async function archiveAccount(id: string, userId: string) {
  const result = await query(
    `UPDATE accounts SET is_archived = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  return result.rows[0];
}

export async function getAccountBalanceHistory(id: string, userId: string, startDate?: string, endDate?: string) {
  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const result = await query(`
    WITH daily AS (
      SELECT transaction_date::date as date,
             SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
             SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as daily_change
      FROM transactions
      WHERE account_id = $1 AND user_id = $4 AND transaction_date BETWEEN $2 AND $3
      GROUP BY transaction_date
    )
    SELECT date, daily_change,
           SUM(daily_change) OVER (ORDER BY date) +
           (SELECT opening_balance FROM accounts WHERE id = $1 AND user_id = $4) as running_balance
    FROM daily
    ORDER BY date
  `, [id, start, end, userId]);

  return result.rows;
}
