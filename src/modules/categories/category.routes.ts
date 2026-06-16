import { Router } from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './category.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All category routes require authentication
router.use(authenticate);

// GET /api/v1/categories - Get all categories (all authenticated roles)
router.get('/', getAllCategories);

// POST /api/v1/categories - Create a category (all authenticated roles)
router.post('/', createCategory);

// PUT /api/v1/categories/:id - Update a category (all authenticated roles)
router.put('/:id', updateCategory);

// DELETE /api/v1/categories/:id - Delete a category (admin only)
router.delete('/:id', authorize('admin'), deleteCategory);


export default router;
