import { Response, NextFunction } from 'express';
import * as categoryService from '../services/categoryService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function listCategories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.listCategories(req.user!.id);
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.createCategory(req.user!.id, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.updateCategory(req.params.id as string, req.user!.id, req.body);
    if (!category) throw createError(404, 'Category not found');
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.deleteCategory(
      req.params.id as string,
      req.user!.id,
      req.query.reassignTo as string
    );
    if (!category) throw createError(404, 'Category not found');
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}
