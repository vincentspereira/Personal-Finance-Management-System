import { Router } from 'express';
import * as ctrl from '../controllers/reportController';

const router = Router();

router.get('/monthly', ctrl.getMonthlyReport);
router.get('/annual', ctrl.getAnnualReport);
router.post('/custom', ctrl.getCustomReport);
router.get('/net-worth', ctrl.getNetWorth);

export default router;
