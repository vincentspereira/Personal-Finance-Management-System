import { Response, NextFunction } from 'express';
import * as analyticsService from '../services/analyticsService';
import * as budgetAlertService from '../services/budgetAlertService';
import * as reportService from '../services/reportService';
import { AuthRequest } from '../middleware/auth';

export async function getSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
    const data = await analyticsService.getSummary(req.user!.id, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getByCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
    const data = await analyticsService.getByCategory(req.user!.id, startDate, endDate, req.query.type as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getTrends(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const data = await analyticsService.getTrends(req.user!.id, months);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getTopMerchants(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
    const data = await analyticsService.getTopMerchants(req.user!.id, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getCashflow(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
    const data = await analyticsService.getCashflow(req.user!.id, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getBudgetVsActual(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
    const data = await analyticsService.getBudgetVsActual(req.user!.id, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getRecurring(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getRecurring(req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getNetWorthHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const months = req.query.months ? parseInt(req.query.months as string) : 12;
    const data = await reportService.getNetWorth(req.user!.id);
    // Return net worth with monthly breakdown
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getBudgetAlerts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alerts = await budgetAlertService.getBudgetAlerts(req.user!.id);
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
}
