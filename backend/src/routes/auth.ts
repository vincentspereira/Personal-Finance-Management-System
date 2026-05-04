import { Router } from 'express';
import * as ctrl from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/profile', authMiddleware, ctrl.getProfile);

export default router;
