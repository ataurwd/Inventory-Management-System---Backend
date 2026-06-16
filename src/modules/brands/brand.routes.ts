import { Router } from 'express';
import {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from './brand.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All brand routes require authentication
router.use(authenticate);

// GET /api/v1/brands - Get all brands (all authenticated roles)
router.get('/', getAllBrands);

// POST /api/v1/brands - Create a brand (admin, manager only)
router.post('/', authorize('admin', 'manager'), createBrand);

// PUT /api/v1/brands/:id - Update a brand (admin, manager only)
router.put('/:id', authorize('admin', 'manager'), updateBrand);

// DELETE /api/v1/brands/:id - Delete a brand (admin, manager only)
router.delete('/:id', authorize('admin', 'manager'), deleteBrand);

export default router;
