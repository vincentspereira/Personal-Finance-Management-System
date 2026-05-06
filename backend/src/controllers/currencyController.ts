import { Response, NextFunction } from 'express';
import * as currencyService from '../services/currencyService';
import { AuthRequest } from '../middleware/auth';

export async function getExchangeRates(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const base = (req.query.base as string) || 'USD';
    const data = await currencyService.getRates(base);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function convertAmount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { amount, from, to } = req.body;
    if (!amount || !from || !to) {
      return res.status(400).json({ success: false, error: 'amount, from, and to are required' });
    }
    const result = await currencyService.convertCurrency(parseFloat(amount), from, to);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function listCurrencies(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: currencyService.SUPPORTED_CURRENCIES });
  } catch (err) { next(err); }
}
