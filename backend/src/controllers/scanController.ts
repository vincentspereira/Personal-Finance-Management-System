import { Response, NextFunction } from 'express';
import * as scanService from '../services/scanService';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export async function uploadScan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw createError(400, 'No files uploaded');
    }

    const scans = [];
    for (const file of files) {
      const scan = await scanService.createScanRecord(req.user!.id, file.originalname, file.path);
      scans.push(scan);

      scanService.processScan(scan.id).catch(console.error);
    }

    res.status(202).json({
      success: true,
      data: scans,
      meta: { count: scans.length, message: 'Files uploaded and processing started' },
    });
  } catch (err) { next(err); }
}

export async function getScanStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scan = await scanService.getScan(req.params.id as string, req.user!.id);
    if (!scan) throw createError(404, 'Scan not found');
    res.json({ success: true, data: { id: scan.id, status: scan.status, document_count: scan.document_count, error_message: scan.error_message } });
  } catch (err) { next(err); }
}

export async function getScanResults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [scan, documents] = await Promise.all([
      scanService.getScan(req.params.id as string, req.user!.id),
      scanService.getScanDocuments(req.params.id as string),
    ]);
    if (!scan) throw createError(404, 'Scan not found');
    res.json({ success: true, data: { scan, documents } });
  } catch (err) { next(err); }
}

export async function confirmScan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents)) {
      throw createError(400, 'documents array is required');
    }
    await scanService.confirmDocuments(req.user!.id, req.params.id as string, documents);
    res.json({ success: true, data: { confirmed: documents.length } });
  } catch (err) { next(err); }
}

export async function retryScan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scan = await scanService.retryScan(req.params.id as string, req.user!.id);
    if (!scan) throw createError(404, 'Scan not found or not in failed state');
    res.json({ success: true, data: { id: scan.id, status: 'pending' } });
  } catch (err) { next(err); }
}

export async function listScans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const data = await scanService.listScans(req.user!.id, page, limit);
    res.json({ success: true, data: data.rows, meta: { pagination: data } });
  } catch (err) { next(err); }
}
