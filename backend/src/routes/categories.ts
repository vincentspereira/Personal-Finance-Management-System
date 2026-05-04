import { Router } from 'express';
import * as ctrl from '../controllers/categoryController';

const router = Router();

router.get('/', ctrl.listCategories);
router.post('/', ctrl.createCategory);
router.put('/:id', ctrl.updateCategory);
router.delete('/:id', ctrl.deleteCategory);

export default router;
