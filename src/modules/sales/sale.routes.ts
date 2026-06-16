import { Router } from 'express';
import { getSales, getSale, createSale, updateSale, deleteSale } from './sale.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Apply authentication middleware to all sales routes
router.use(authenticate);

// List and detail routes accessible by all roles (admin, manager, cashier)
router.get('/', getSales);
router.get('/:id', getSale);

// Create and Edit routes accessible by all roles
router.post('/', createSale);
router.put('/:id', updateSale);

// Deletion is strictly restricted to administrator role only
router.delete('/:id', authorize('admin'), deleteSale);

export default router;
