import { query } from '../db';

interface PatternCandidate {
  description: string | null;
  merchant_name: string | null;
  occurrences: { date: string; amount: string }[];
}

interface DetectedPattern {
  description: string | null;
  merchant_name: string | null;
  category_id: string | null;
  account_id: string | null;
  avg_amount: number;
  frequency: string;
  interval_days: number;
  confidence: number;
  occurrence_count: number;
  first_date: string;
  last_date: string;
  next_predicted_date: string | null;
}

function medianIntervalDays(dates: string[]): number {
  if (dates.length < 2) return 0;
  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(Math.round((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24)));
  }
  intervals.sort((a, b) => a - b);
  return intervals[Math.floor(intervals.length / 2)];
}

function classifyFrequency(days: number): { frequency: string; interval_days: number } {
  if (days <= 8) return { frequency: 'weekly', interval_days: 7 };
  if (days <= 18) return { frequency: 'biweekly', interval_days: 14 };
  if (days <= 38) return { frequency: 'monthly', interval_days: 30 };
  if (days <= 100) return { frequency: 'quarterly', interval_days: 90 };
  return { frequency: 'yearly', interval_days: 365 };
}

function predictNextDate(lastDate: string, intervalDays: number): string {
  const d = new Date(lastDate);
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().split('T')[0];
}

export async function detectRecurringPatterns(userId: string): Promise<DetectedPattern[]> {
  // Get all transactions with same description or merchant, grouped
  const result = await query(`
    SELECT description, merchant_name, category_id, account_id, amount, transaction_date
    FROM transactions
    WHERE user_id = $1
      AND (description IS NOT NULL OR merchant_name IS NOT NULL)
      AND type = 'expense'
    ORDER BY description, merchant_name, transaction_date
  `, [userId]);

  const groups = new Map<string, PatternCandidate>();

  for (const row of result.rows) {
    const key = (row.description || '').toLowerCase().trim() || (row.merchant_name || '').toLowerCase().trim();
    if (!key) continue;

    if (!groups.has(key)) {
      groups.set(key, {
        description: row.description,
        merchant_name: row.merchant_name,
        occurrences: [],
      });
    }
    groups.get(key)!.occurrences.push({
      date: row.transaction_date,
      amount: row.amount,
    });
  }

  const patterns: DetectedPattern[] = [];

  for (const [key, group] of groups) {
    if (group.occurrences.length < 2) continue;

    const dates = group.occurrences.map(o => o.date);
    const medianDays = medianIntervalDays(dates);

    // Must have a recognizable pattern (7-400 days interval)
    if (medianDays < 5 || medianDays > 400) continue;

    const amounts = group.occurrences.map(o => parseFloat(o.amount));
    const avgAmount = Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100;

    // Check amount consistency (for subscriptions, amounts are usually similar)
    const amountVariance = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.3);

    const { frequency, interval_days } = classifyFrequency(medianDays);

    // Confidence based on occurrence count, amount consistency, and date regularity
    let confidence = Math.min(group.occurrences.length / 6, 1) * 0.5;
    if (amountVariance) confidence += 0.3;
    // Check date regularity
    const allDates = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < allDates.length; i++) {
      intervals.push(Math.abs(Math.round((allDates[i] - allDates[i - 1]) / (1000 * 60 * 60 * 24)) - medianDays));
    }
    const avgDeviation = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    if (avgDeviation < 5) confidence += 0.2;

    const lastRow = result.rows.find(r =>
      (r.description || '').toLowerCase().trim() === key || (r.merchant_name || '').toLowerCase().trim() === key
    );

    patterns.push({
      description: group.description,
      merchant_name: group.merchant_name,
      category_id: lastRow?.category_id || null,
      account_id: lastRow?.account_id || null,
      avg_amount: avgAmount,
      frequency,
      interval_days,
      confidence: Math.round(confidence * 100) / 100,
      occurrence_count: group.occurrences.length,
      first_date: dates[0],
      last_date: dates[dates.length - 1],
      next_predicted_date: predictNextDate(dates[dates.length - 1], interval_days),
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

export async function saveRecurringPatterns(userId: string, patterns: DetectedPattern[]) {
  // Clear existing patterns for user
  await query('DELETE FROM recurring_patterns WHERE user_id = $1', [userId]);

  for (const p of patterns) {
    await query(`
      INSERT INTO recurring_patterns (
        user_id, description, merchant_name, category_id, account_id,
        avg_amount, frequency, interval_days, confidence, occurrence_count,
        first_date, last_date, next_predicted_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      userId, p.description, p.merchant_name, p.category_id, p.account_id,
      p.avg_amount, p.frequency, p.interval_days, p.confidence, p.occurrence_count,
      p.first_date, p.last_date, p.next_predicted_date,
    ]);
  }
}

export async function getRecurringPatterns(userId: string) {
  const result = await query(
    'SELECT * FROM recurring_patterns WHERE user_id = $1 AND is_active = true ORDER BY confidence DESC',
    [userId]
  );
  return result.rows;
}

export async function getUpcomingBills(userId: string, days: number = 30) {
  const result = await query(`
    SELECT * FROM recurring_patterns
    WHERE user_id = $1 AND is_active = true
      AND next_predicted_date <= CURRENT_DATE + INTERVAL '1 day' * $2
    ORDER BY next_predicted_date
  `, [userId, days]);
  return result.rows;
}

export async function toggleRecurringPattern(patternId: string, userId: string, active: boolean) {
  const result = await query(
    'UPDATE recurring_patterns SET is_active = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [active, patternId, userId]
  );
  return result.rows[0] || null;
}

export async function refreshRecurringPatterns(userId: string) {
  const patterns = await detectRecurringPatterns(userId);
  await saveRecurringPatterns(userId, patterns);
  return patterns;
}
