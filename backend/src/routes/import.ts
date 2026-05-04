import { Router } from 'express';
import * as ctrl from '../controllers/importController';

const router = Router();

router.post('/preview', ctrl.upload.array('files', 1), ctrl.importPreview);
router.post('/confirm', ctrl.importConfirm);

export default router;
