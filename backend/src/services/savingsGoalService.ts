import { query } from '../db';

export async function listSavingsGoals(userId: string) {
  const result = await query(
    'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getSavingsGoal(id: string, userId: string) {
  const result = await query(
    'SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function createSavingsGoal(userId: string, data: {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
  color?: string;
}) {
  const result = await query(`
    INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, color)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [userId, data.name, data.target_amount, data.current_amount || 0, data.target_date || null, data.color || '#3b82f6']);
  return result.rows[0];
}

export async function updateSavingsGoal(id: string, userId: string, data: {
  name?: string;
  target_amount?: number;
  current_amount?: number;
  target_date?: string;
  color?: string;
  is_completed?: boolean;
}) {
  const fields: string[] = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = $${paramIdx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return null;

  fields.push('updated_at = NOW()');
  const result = await query(
    `UPDATE savings_goals SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteSavingsGoal(id: string, userId: string) {
  const result = await query(
    'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows[0] || null;
}
