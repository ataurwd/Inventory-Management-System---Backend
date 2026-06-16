import { Request, Response, NextFunction } from 'express';
import * as saleService from './sale.service';
import { CreateSaleSchema, UpdateSaleSchema } from './sale.validation';
import { success, created } from '../../utils/api-response.util';

export async function getSales(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page?.toString() || '1', 10);
    const limit = parseInt(req.query.limit?.toString() || '20', 10);

    const filters = {
      invoiceNumber: req.query.invoiceNumber?.toString(),
      customer: req.query.customer?.toString(),
      paymentStatus: req.query.paymentStatus?.toString(),
      saleStatus: req.query.saleStatus?.toString(),
      createdBy: req.query.createdBy?.toString(),
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
      product: req.query.product?.toString(),
    };

    const data = await saleService.getSales(filters, page, limit);
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getSale(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const sale = await saleService.getSaleById(id);
    return success(res, sale);
  } catch (error) {
    next(error);
  }
}

export async function createSale(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const input = CreateSaleSchema.parse(req.body);
    const sale = await saleService.createSale(input, userId);
    return created(res, sale);
  } catch (error) {
    next(error);
  }
}

export async function updateSale(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const input = UpdateSaleSchema.parse(req.body);
    const sale = await saleService.updateSale(id, input, userId);
    return success(res, sale);
  } catch (error) {
    next(error);
  }
}

export async function deleteSale(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await saleService.deleteSale(id, userId);
    return success(res, result);
  } catch (error) {
    next(error);
  }
}
