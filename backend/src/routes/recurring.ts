import { Router } from 'express';
import * as ctrl from '../controllers/recurringController';

const router = Router();

router.get('/', ctrl.getRecurring);
router.get('/upcoming', ctrl.getUpcoming);
router.post('/refresh', ctrl.refreshPatterns);
router.put('/:id/toggle', ctrl.togglePattern);

export default router;
