import { Router } from 'express';
import * as currencyController from '../controllers/currencyController';

const router = Router();

router.get('/rates', currencyController.getExchangeRates);
router.post('/convert', currencyController.convertAmount);
router.get('/list', currencyController.listCurrencies);

export default router;
