import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
} from './product.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Apply authentication middleware to all product routes
router.use(authenticate);

// Read-only routes available to all authenticated roles
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/barcode/:code', getProductByBarcode);

// Write/Edit routes available to all authenticated roles
router.post('/', createProduct);
router.put('/:id', updateProduct);

// Deletion is strictly restricted to administrator role only
router.delete('/:id', authorize('admin'), deleteProduct);


export default router;
