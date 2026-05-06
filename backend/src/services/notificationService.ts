import { query } from '../db';
import { getBudgetAlerts } from './budgetAlertService';
import { listSavingsGoals } from './savingsGoalService';

export interface Notification {
  id: string;
  user_id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'goal_completed' | 'recurring_due' | 'info';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export async function createNotification(userId: string, type: Notification['type'], title: string, message: string, data: any = {}) {
  // Avoid duplicate unread notifications of the same type/data within last 24h
  const existing = await query(
    `SELECT id FROM notifications
     WHERE user_id = $1 AND type = $2 AND is_read = false AND data = $3 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId, type, JSON.stringify(data)]
  );
  if (existing.rows.length > 0) return;

  await query(
    `INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, message, JSON.stringify(data)]
  );
}

export async function listNotifications(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [data, count, unread] = await Promise.all([
    query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]),
    query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]),
    query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
  ]);
  return {
    rows: data.rows,
    total: parseInt(count.rows[0].count),
    unread: parseInt(unread.rows[0].count),
    page,
    limit,
  };
}

export async function markRead(notificationId: string, userId: string) {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [notificationId, userId]);
}

export async function markAllRead(userId: string) {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
}

export async function deleteNotification(notificationId: string, userId: string) {
  await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
}

export async function generateBudgetNotifications(userId: string) {
  const alerts = await getBudgetAlerts(userId);

  for (const alert of alerts) {
    await createNotification(
      userId,
      alert.alert_type === 'exceeded' ? 'budget_exceeded' : 'budget_warning',
      alert.alert_type === 'exceeded' ? 'Budget Exceeded' : 'Budget Warning',
      `${alert.category_name}: $${alert.actual_spent.toFixed(0)} of $${alert.budget_amount.toFixed(0)} (${alert.percentage}%)`,
      { budget_id: alert.budget_id, category_name: alert.category_name, percentage: alert.percentage }
    );
  }
}

export async function generateGoalNotifications(userId: string) {
  const goals = await listSavingsGoals(userId);

  for (const goal of goals) {
    const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    if (pct >= 100 && !goal.is_completed) {
      await createNotification(
        userId,
        'goal_completed',
        'Savings Goal Completed!',
        `Congratulations! You've reached your "${goal.name}" goal of $${parseFloat(goal.target_amount).toLocaleString()}`,
        { goal_id: goal.id, goal_name: goal.name }
      );
    }
  }
}
