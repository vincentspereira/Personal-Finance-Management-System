import { Response, NextFunction } from 'express';
import * as reportService from '../services/reportService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function getMonthlyReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const data = await reportService.getMonthlyReport(req.user!.id, year, month);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getAnnualReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await reportService.getAnnualReport(req.user!.id, year);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getCustomReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) throw createError(400, 'startDate and endDate are required');
    const data = await reportService.getCustomReport(req.user!.id, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getNetWorth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await reportService.getNetWorth(req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
