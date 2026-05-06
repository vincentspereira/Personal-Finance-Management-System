import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';

const router = Router();

router.get('/', notificationController.listNotifications);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
