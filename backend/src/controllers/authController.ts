import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw createError(400, 'email, password, and name are required');
    }
    if (password.length < 6) {
      throw createError(400, 'Password must be at least 6 characters');
    }
    const result = await authService.register(email, password, name);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw createError(400, 'email and password are required');
    }
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw createError(401, 'Not authenticated');
    const user = await authService.getUser(req.user.id);
    if (!user) throw createError(404, 'User not found');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}
