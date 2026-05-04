import { Response, NextFunction } from 'express';
import * as budgetService from '../services/budgetService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function listBudgets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await budgetService.listBudgets(req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createBudget(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const budget = await budgetService.createBudget(req.user!.id, req.body);
    res.status(201).json({ success: true, data: budget });
  } catch (err) { next(err); }
}

export async function updateBudget(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const budget = await budgetService.updateBudget(req.params.id as string, req.user!.id, req.body);
    if (!budget) throw createError(404, 'Budget not found');
    res.json({ success: true, data: budget });
  } catch (err) { next(err); }
}

export async function deleteBudget(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const budget = await budgetService.deleteBudget(req.params.id as string, req.user!.id);
    if (!budget) throw createError(404, 'Budget not found');
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}
