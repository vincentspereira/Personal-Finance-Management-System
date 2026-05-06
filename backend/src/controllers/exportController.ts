import { Response, NextFunction } from 'express';
import * as exportService from '../services/exportService';
import { AuthRequest } from '../middleware/auth';

export async function exportTransactionsCSV(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;
    const csv = await exportService.exportTransactionsCSV(req.user!.id, {
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
}

export async function exportReportCSV(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, year, month, startDate, endDate } = req.query;
    const csv = await exportService.exportReportCSV(req.user!.id, type as any || 'monthly', {
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `report_${type || 'monthly'}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
}
