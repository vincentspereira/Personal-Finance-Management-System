import { Router } from 'express';
import * as ctrl from '../controllers/accountController';

const router = Router();

router.get('/', ctrl.listAccounts);
router.post('/', ctrl.createAccount);
router.get('/:id/balance', ctrl.getAccountBalance);
router.put('/:id', ctrl.updateAccount);
router.delete('/:id', ctrl.archiveAccount);

export default router;
