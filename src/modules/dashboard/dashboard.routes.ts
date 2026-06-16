import { Router } from 'express';
import { getDashboardStats, getDashboardWasteRisk } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/waste-risk', getDashboardWasteRisk);

export default router;
