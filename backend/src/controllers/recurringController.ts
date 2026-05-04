import { Response, NextFunction } from 'express';
import * as recurringService from '../services/recurringService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function getRecurring(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const patterns = await recurringService.getRecurringPatterns(req.user!.id);
    res.json({ success: true, data: patterns });
  } catch (err) { next(err); }
}

export async function getUpcoming(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const bills = await recurringService.getUpcomingBills(req.user!.id, days);
    res.json({ success: true, data: bills });
  } catch (err) { next(err); }
}

export async function refreshPatterns(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const patterns = await recurringService.refreshRecurringPatterns(req.user!.id);
    res.json({ success: true, data: patterns });
  } catch (err) { next(err); }
}

export async function togglePattern(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { active } = req.body;
    if (typeof active !== 'boolean') throw createError(400, 'active must be a boolean');

    const result = await recurringService.toggleRecurringPattern(id, req.user!.id, active);
    if (!result) throw createError(404, 'Pattern not found');
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
