import { Router } from 'express';
import { addBatch, updateBatch, removeBatch } from './batch.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

// All batch routes require authentication
router.use(authenticate);

// POST /products/:id/batches — Add a new batch (admin, manager)
router.post('/', authorize('admin', 'manager'), addBatch);

// PUT /products/:id/batches/:batchNo — Update a batch (admin, manager)
router.put('/:batchNo', authorize('admin', 'manager'), updateBatch);

// DELETE /products/:id/batches/:batchNo — Remove a batch (admin, manager)
router.delete('/:batchNo', authorize('admin', 'manager'), removeBatch);

export default router;
