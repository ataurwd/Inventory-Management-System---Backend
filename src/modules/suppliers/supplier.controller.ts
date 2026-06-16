import { Request, Response, NextFunction } from 'express';
import * as supplierService from './supplier.service';
import { success, created } from '../../utils/api-response.util';

export async function createSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return created(res, supplier);
  } catch (error) {
    next(error);
  }
}

export async function getAllSuppliersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    return success(res, suppliers);
  } catch (error) {
    next(error);
  }
}

export async function getSupplierByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    return success(res, supplier);
  } catch (error) {
    next(error);
  }
}

export async function updateSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return success(res, supplier);
  } catch (error) {
    next(error);
  }
}

export async function deleteSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await supplierService.deleteSupplier(req.params.id);
    return success(res, null);
  } catch (error) {
    next(error);
  }
}
