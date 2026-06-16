import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as brandService from './brand.service';
import { success, created } from '../../utils/api-response.util';

const BrandInputSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
});

export async function getAllBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const brands = await brandService.getAllBrands();
    return success(res, brands);
  } catch (error) {
    next(error);
  }
}

export async function createBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = BrandInputSchema.parse(req.body);
    const brand = await brandService.createBrand(name);
    return created(res, brand);
  } catch (error) {
    next(error);
  }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name } = BrandInputSchema.parse(req.body);
    const brand = await brandService.updateBrand(id, name);
    return success(res, brand);
  } catch (error) {
    next(error);
  }
}

export async function deleteBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await brandService.deleteBrand(id);
    return success(res, result);
  } catch (error) {
    next(error);
  }
}
