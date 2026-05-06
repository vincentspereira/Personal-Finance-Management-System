import cron from 'node-cron';
import { query } from '../db';
import { createNotification } from './notificationService';

async function processRecurringTransactions() {
  const today = new Date().toISOString().split('T')[0];

  // Find all active recurring patterns where next_predicted_date is today or earlier
  const result = await query(`
    SELECT rp.*, u.id as user_id
    FROM recurring_patterns rp
    JOIN users u ON rp.user_id = u.id
    WHERE rp.is_active = true
      AND rp.next_predicted_date <= $1
      AND rp.account_id IS NOT NULL
  `, [today]);

  let created = 0;

  for (const pattern of result.rows) {
    // Check if a transaction was already created for this pattern today
    const existing = await query(
      `SELECT id FROM transactions
       WHERE user_id = $1 AND account_id = $2
       AND description = $3 AND merchant_name = $4
       AND transaction_date = $5
       AND source = 'recurring'`,
      [pattern.user_id, pattern.account_id, pattern.description, pattern.merchant_name, today]
    );

    if (existing.rows.length > 0) continue;

    // Create the recurring transaction
    await query(
      `INSERT INTO transactions (
        user_id, account_id, category_id, type, amount, description,
        merchant_name, transaction_date, is_recurring, recurrence_pattern, source
      ) VALUES ($1, $2, $3, 'expense', $4, $5, $6, $7, true, $8, 'recurring')`,
      [
        pattern.user_id,
        pattern.account_id,
        pattern.category_id,
        pattern.avg_amount,
        pattern.description,
        pattern.merchant_name,
        today,
        JSON.stringify({ pattern_id: pattern.id, frequency: pattern.frequency }),
      ]
    );

    // Update next predicted date
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + pattern.interval_days);
    await query(
      'UPDATE recurring_patterns SET next_predicted_date = $1, occurrence_count = occurrence_count + 1 WHERE id = $2',
      [nextDate.toISOString().split('T')[0], pattern.id]
    );

    // Notify the user
    await createNotification(
      pattern.user_id,
      'recurring_due',
      'Recurring Transaction Created',
      `${pattern.description || pattern.merchant_name}: $${parseFloat(pattern.avg_amount).toFixed(2)} (${pattern.frequency})`,
      { pattern_id: pattern.id }
    );

    created++;
  }

  if (created > 0) {
    console.log(`[Scheduler] Created ${created} recurring transaction(s)`);
  }
}

async function generateDailyBudgetAlerts() {
  const users = await query('SELECT id FROM users');
  for (const user of users.rows) {
    const { getBudgetAlerts } = await import('./budgetAlertService');
    const alerts = await getBudgetAlerts(user.id);

    for (const alert of alerts) {
      await createNotification(
        user.id,
        alert.alert_type === 'exceeded' ? 'budget_exceeded' : 'budget_warning',
        alert.alert_type === 'exceeded' ? 'Budget Exceeded' : 'Budget Warning',
        `${alert.category_name}: $${alert.actual_spent.toFixed(0)} of $${alert.budget_amount.toFixed(0)} (${alert.percentage}%)`,
        { budget_id: alert.budget_id, percentage: alert.percentage }
      );
    }
  }
}

export function startScheduler() {
  // Run recurring transaction processing every day at 6 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Processing recurring transactions...');
    try {
      await processRecurringTransactions();
    } catch (err) {
      console.error('[Scheduler] Recurring transaction error:', err);
    }
  });

  // Check budget alerts every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Checking budget alerts...');
    try {
      await generateDailyBudgetAlerts();
    } catch (err) {
      console.error('[Scheduler] Budget alert error:', err);
    }
  });

  console.log('[Scheduler] Cron jobs started (recurring at 6 AM, budget alerts at 8 AM)');
}
