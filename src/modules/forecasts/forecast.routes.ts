import { Router } from 'express';
import * as controller from './forecast.controller';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authorize('admin', 'manager'));

router.get('/', controller.getAllForecasts);
router.get('/:productId', controller.getForecastByProduct);
router.post('/trigger', authorize('admin'), controller.triggerManualForecast);

export default router;
