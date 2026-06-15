import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as categoryService from './category.service';
import { success, created } from '../../utils/api-response.util';

const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export async function getAllCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.getAllCategories();
    return success(res, categories);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = CategoryInputSchema.parse(req.body);
    const category = await categoryService.createCategory(name);
    return created(res, category);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name } = CategoryInputSchema.parse(req.body);
    const category = await categoryService.updateCategory(id, name);
    return success(res, category);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(id);
    return success(res, result);
  } catch (error) {
    next(error);
  }
}
