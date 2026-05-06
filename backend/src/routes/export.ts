import { Router } from 'express';
import * as exportController from '../controllers/exportController';

const router = Router();

router.get('/transactions', exportController.exportTransactionsCSV);
router.get('/report', exportController.exportReportCSV);

export default router;
