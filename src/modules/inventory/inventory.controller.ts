import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as inventoryService from './inventory.service';
import { success } from '../../utils/api-response.util';
import { ApiError } from '../../utils/api-error.util';

const ScanSellSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  qty: z.number().int().positive('Quantity must be a positive integer'),
});

export async function scanSell(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const { barcode, qty } = ScanSellSchema.parse(req.body);
    const result = await inventoryService.scanSell(barcode, qty, req.user.id);
    return success(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getLowStock(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.getLowStock();
    return success(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getExpiryAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const days = parseInt(req.query.days?.toString() || '15') || 15;
    const result = await inventoryService.getExpiryAlerts(days);
    return success(res, result);
  } catch (error) {
    next(error);
  }
}
