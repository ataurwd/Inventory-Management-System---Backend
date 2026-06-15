import mongoose from 'mongoose';
import { Product } from '../products/product.model';
import { ApiError } from '../../utils/api-error.util';
import { createTransaction } from '../transactions/transaction.service';

export interface AddBatchInput {
  batch_no: string;
  qty: number;
  manufacture_date?: Date;
  expiry_date: Date;
}

export interface UpdateBatchInput {
  qty?: number;
  expiry_date?: Date;
}

/**
 * Add a new batch to a product's batches array.
 */
export async function addBatch(productId: string, batchData: AddBatchInput) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Check for duplicate batch number within this product
  const existingBatch = product.batches.find((b) => b.batch_no === batchData.batch_no);
  if (existingBatch) {
    throw ApiError.conflict('Batch number already exists for this product', 'BATCH_EXISTS');
  }

  product.batches.push({
    batch_no: batchData.batch_no,
    qty: batchData.qty,
    expiry_date: batchData.expiry_date,
  });

  await product.save();
  return product;
}

/**
 * Update a specific batch within a product.
 */
export async function updateBatch(productId: string, batchNo: string, updates: UpdateBatchInput) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const batch = product.batches.find((b) => b.batch_no === batchNo);
  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  if (updates.qty !== undefined) {
    batch.qty = updates.qty;
  }
  if (updates.expiry_date !== undefined) {
    batch.expiry_date = updates.expiry_date;
  }

  await product.save();
  return product;
}

/**
 * Remove a batch from a product's batches array.
 */
export async function removeBatch(productId: string, batchNo: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const batchIndex = product.batches.findIndex((b) => b.batch_no === batchNo);
  if (batchIndex === -1) {
    throw ApiError.notFound('Batch not found');
  }

  const batch = product.batches[batchIndex];

  // Record a waste transaction before removing the batch
  await createTransaction({
    type: 'waste',
    productId: product._id,
    batchNo: batch.batch_no,
    qty: batch.qty,
    unitPrice: product.costPrice,
    total: batch.qty * product.costPrice,
    performedBy: userId,
  });

  product.batches.splice(batchIndex, 1);
  await product.save();
  return product;
}
