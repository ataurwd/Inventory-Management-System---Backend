import { Router } from 'express';
import { scanSell, getLowStock, getExpiryAlerts } from './inventory.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/scan-sell', scanSell);
router.get('/low-stock', getLowStock);
router.get('/expiry-alerts', getExpiryAlerts);

export default router;
