import { Router } from 'express';
import * as ctrl from '../controllers/savingsGoalController';

const router = Router();

router.get('/', ctrl.listGoals);
router.post('/', ctrl.createGoal);
router.put('/:id', ctrl.updateGoal);
router.delete('/:id', ctrl.deleteGoal);

export default router;
