import { Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';
import { AuthRequest } from '../middleware/auth';

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await notificationService.listNotifications(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.markRead(req.params.id as string, req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllRead(req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await notificationService.deleteNotification(req.params.id as string, req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}
