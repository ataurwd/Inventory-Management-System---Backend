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

// Write/Edit routes restricted to admin and manager roles
router.post('/', authorize('admin', 'manager'), createProduct);
router.put('/:id', authorize('admin', 'manager'), updateProduct);
router.delete('/:id', authorize('admin', 'manager'), deleteProduct);

export default router;
