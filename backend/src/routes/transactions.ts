import { Router } from 'express';
import * as ctrl from '../controllers/transactionController';

const router = Router();

router.get('/', ctrl.listTransactions);
router.get('/export', ctrl.exportTransactions);
router.post('/bulk', ctrl.bulkCreateTransactions);
router.get('/:id', ctrl.getTransaction);
router.post('/', ctrl.createTransaction);
router.put('/:id', ctrl.updateTransaction);
router.delete('/:id', ctrl.deleteTransaction);

export default router;
