import { Router } from 'express';
import * as ctrl from '../controllers/budgetController';

const router = Router();

router.get('/', ctrl.listBudgets);
router.post('/', ctrl.createBudget);
router.put('/:id', ctrl.updateBudget);
router.delete('/:id', ctrl.deleteBudget);

export default router;
