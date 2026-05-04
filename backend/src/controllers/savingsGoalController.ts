import { Response, NextFunction } from 'express';
import * as goalService from '../services/savingsGoalService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function listGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const goals = await goalService.listSavingsGoals(req.user!.id);
    res.json({ success: true, data: goals });
  } catch (err) { next(err); }
}

export async function createGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, target_amount, current_amount, target_date, color } = req.body;
    if (!name || !target_amount) throw createError(400, 'name and target_amount are required');
    const goal = await goalService.createSavingsGoal(req.user!.id, {
      name, target_amount: parseFloat(target_amount),
      current_amount: current_amount ? parseFloat(current_amount) : 0,
      target_date, color,
    });
    res.status(201).json({ success: true, data: goal });
  } catch (err) { next(err); }
}

export async function updateGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const goal = await goalService.updateSavingsGoal(id, req.user!.id, req.body);
    if (!goal) throw createError(404, 'Goal not found');
    res.json({ success: true, data: goal });
  } catch (err) { next(err); }
}

export async function deleteGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await goalService.deleteSavingsGoal(req.params.id as string, req.user!.id);
    if (!result) throw createError(404, 'Goal not found');
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}
