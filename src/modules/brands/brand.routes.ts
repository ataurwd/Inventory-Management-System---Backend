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

// POST /api/v1/brands - Create a brand (all authenticated roles)
router.post('/', createBrand);

// PUT /api/v1/brands/:id - Update a brand (all authenticated roles)
router.put('/:id', updateBrand);

// DELETE /api/v1/brands/:id - Delete a brand (admin only)
router.delete('/:id', authorize('admin'), deleteBrand);


export default router;
