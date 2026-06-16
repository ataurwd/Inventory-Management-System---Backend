import { Router } from 'express';
import * as supplierController from './supplier.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All supplier routes require authentication
router.use(authenticate);

// GET /api/v1/suppliers (All authenticated roles)
router.get('/', supplierController.getAllSuppliersHandler);

// GET /api/v1/suppliers/:id (All authenticated roles)
router.get('/:id', supplierController.getSupplierByIdHandler);

// POST /api/v1/suppliers (All authenticated roles)
router.post('/', supplierController.createSupplierHandler);

// PUT /api/v1/suppliers/:id (All authenticated roles)
router.put('/:id', supplierController.updateSupplierHandler);

// DELETE /api/v1/suppliers/:id (Admin only)
router.delete('/:id', authorize('admin'), supplierController.deleteSupplierHandler);


export default router;
