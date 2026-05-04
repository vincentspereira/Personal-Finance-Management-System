import { query } from '../db';

export interface BudgetAlert {
  budget_id: string;
  category_name: string;
  budget_amount: number;
  actual_spent: number;
  percentage: number;
  alert_type: 'warning' | 'exceeded';
  remaining_days: number;
  daily_budget_remaining: number;
}

export async function getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const result = await query(`
    SELECT b.id as budget_id, c.name as category_name,
           b.amount as budget_amount,
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
    GROUP BY b.id, c.name, b.amount
  `, [userId, startOfMonth, today]);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate() + 1;

  const alerts: BudgetAlert[] = [];

  for (const row of result.rows) {
    const budget = parseFloat(row.budget_amount);
    const spent = parseFloat(row.actual_spent);
    const pct = budget > 0 ? (spent / budget) * 100 : 0;

    if (pct >= 80) {
      alerts.push({
        budget_id: row.budget_id,
        category_name: row.category_name,
        budget_amount: budget,
        actual_spent: spent,
        percentage: Math.round(pct),
        alert_type: pct >= 100 ? 'exceeded' : 'warning',
        remaining_days: daysRemaining,
        daily_budget_remaining: daysRemaining > 0
          ? Math.round(Math.max(0, (budget - spent) / daysRemaining) * 100) / 100
          : 0,
      });
    }
  }

  return alerts.sort((a, b) => b.percentage - a.percentage);
}
