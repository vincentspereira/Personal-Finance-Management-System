import { Router } from 'express';
import { upload } from '../middleware/upload';
import * as ctrl from '../controllers/scanController';

const router = Router();

router.post('/upload', upload.array('files', 20), ctrl.uploadScan);
router.get('/:id/status', ctrl.getScanStatus);
router.get('/:id/results', ctrl.getScanResults);
router.post('/:id/confirm', ctrl.confirmScan);
router.post('/:id/retry', ctrl.retryScan);
router.get('/', ctrl.listScans);

export default router;
