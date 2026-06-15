import { Router } from 'express';
import {
  getProductTransactions,
  getAllTransactions,
  getTransactionSummary,
  getReport,
} from './transaction.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Restricted to managers and admins
router.get('/', authorize('admin', 'manager'), getAllTransactions);
router.get('/summary', authorize('admin', 'manager'), getTransactionSummary);
router.get('/report', authorize('admin', 'manager'), getReport);

// Accessible by all authenticated users
router.get('/product/:productId', getProductTransactions);

export default router;
