import { Request, Response, NextFunction } from 'express';
import * as batchService from './batch.service';
import { success, created } from '../../utils/api-response.util';
import { getTotalStock } from '../products/product.service';
import { ApiError } from '../../utils/api-error.util';
import { z } from 'zod';

const AddBatchSchema = z.object({
  batch_no: z.string().min(1, 'Batch number is required'),
  qty: z.number().positive('Quantity must be positive'),
  manufacture_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date().optional()),
  expiry_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date({ required_error: 'Expiry date is required' })),
});

const UpdateBatchSchema = z.object({
  qty: z.number().nonnegative('Quantity cannot be negative').optional(),
  expiry_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date().optional()),
});

export async function addBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const input = AddBatchSchema.parse(req.body);
    const product = await batchService.addBatch(id, input);
    const data = {
      ...product.toJSON(),
      totalStock: getTotalStock(product),
    };
    return created(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, batchNo } = req.params;
    const input = UpdateBatchSchema.parse(req.body);
    const product = await batchService.updateBatch(id, batchNo, input);
    const data = {
      ...product.toJSON(),
      totalStock: getTotalStock(product),
    };
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export async function removeBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, batchNo } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized();
    }
    const product = await batchService.removeBatch(id, batchNo, userId);
    const data = {
      ...product.toJSON(),
      totalStock: getTotalStock(product),
    };
    return success(res, data);
  } catch (error) {
    next(error);
  }
}
