import { Request, Response, NextFunction } from 'express';
import * as productService from './product.service';
import { CreateProductSchema, UpdateProductSchema } from './product.validation';
import { success, created } from '../../utils/api-response.util';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search?.toString();
    const category = req.query.category?.toString();
    const products = await productService.getAllProducts({ search, category });
    
    const data = products.map((p) => {
      const plain = p.toJSON();
      return {
        ...plain,
        totalStock: productService.getTotalStock(p),
      };
    });

    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    const data = {
      ...product.toJSON(),
      totalStock: productService.getTotalStock(product),
    };
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getProductByBarcode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const product = await productService.getByBarcode(code);
    const data = {
      ...product.toJSON(),
      totalStock: productService.getTotalStock(product),
    };
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateProductSchema.parse(req.body);
    const product = await productService.createProduct(input);
    const data = {
      ...product.toJSON(),
      totalStock: productService.getTotalStock(product),
    };
    return created(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const input = UpdateProductSchema.parse(req.body);
    const product = await productService.updateProduct(id, input);
    const data = {
      ...product.toJSON(),
      totalStock: productService.getTotalStock(product),
    };
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await productService.softDeleteProduct(id);
    return success(res, { message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
}
