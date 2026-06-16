import { Router } from 'express';
import * as supplierController from './supplier.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All supplier routes require authentication
router.use(authenticate);

// GET /api/v1/suppliers (Manager/Admin)
router.get('/', authorize('admin', 'manager'), supplierController.getAllSuppliersHandler);

// GET /api/v1/suppliers/:id (Manager/Admin)
router.get('/:id', authorize('admin', 'manager'), supplierController.getSupplierByIdHandler);

// POST /api/v1/suppliers (Admin)
router.post('/', authorize('admin'), supplierController.createSupplierHandler);

// PUT /api/v1/suppliers/:id (Admin)
router.put('/:id', authorize('admin'), supplierController.updateSupplierHandler);

// DELETE /api/v1/suppliers/:id (Admin)
router.delete('/:id', authorize('admin'), supplierController.deleteSupplierHandler);

export default router;
