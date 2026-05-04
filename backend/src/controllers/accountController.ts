import { Response, NextFunction } from 'express';
import * as accountService from '../services/accountService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function listAccounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const accounts = await accountService.listAccounts(req.user!.id);
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
}

export async function createAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const account = await accountService.createAccount(req.user!.id, req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err) { next(err); }
}

export async function updateAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const account = await accountService.updateAccount(req.params.id as string, req.user!.id, req.body);
    if (!account) throw createError(404, 'Account not found');
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
}

export async function archiveAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const account = await accountService.archiveAccount(req.params.id as string, req.user!.id);
    if (!account) throw createError(404, 'Account not found');
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
}

export async function getAccountBalance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const history = await accountService.getAccountBalanceHistory(
      req.params.id as string,
      req.user!.id,
      req.query.startDate as string,
      req.query.endDate as string
    );
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
}
