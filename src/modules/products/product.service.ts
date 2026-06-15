import { Product, IProduct } from './product.model';
import { CreateProductInput, UpdateProductInput } from './product.validation';
import { ApiError } from '../../utils/api-error.util';
import mongoose from 'mongoose';
import '../suppliers/supplier.model'; // Force Supplier model registration for populations

export async function getAllProducts(filters: { search?: string; category?: string }) {
  const query: any = { isDeleted: false };

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { barcode: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.category) {
    query.category = filters.category;
  }

  return Product.find(query).populate('supplierId', 'name');
}

export async function getProductById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await Product.findOne({ _id: id, isDeleted: false }).populate('supplierId', 'name');
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  return product;
}

export async function getByBarcode(code: string) {
  const product = await Product.findOne({ barcode: code, isDeleted: false }).populate('supplierId', 'name');
  if (!product) {
    throw ApiError.notFound('Product with this barcode not found');
  }
  return product;
}

export async function createProduct(data: CreateProductInput) {
  // Check barcode uniqueness
  const existing = await Product.findOne({ barcode: data.barcode, isDeleted: false });
  if (existing) {
    throw ApiError.conflict('Product with this barcode already exists', 'BARCODE_EXISTS');
  }

  const product = new Product(data);
  await product.save();
  return product;
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Check barcode conflict if being updated
  if (data.barcode && data.barcode !== product.barcode) {
    const existing = await Product.findOne({ barcode: data.barcode, isDeleted: false });
    if (existing) {
      throw ApiError.conflict('Product with this barcode already exists', 'BARCODE_EXISTS');
    }
  }

  Object.assign(product, data);
  await product.save();
  return product;
}

export async function softDeleteProduct(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid product ID');
  }

  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  product.isDeleted = true;
  await product.save();
  return product;
}

export function getTotalStock(product: IProduct): number {
  if (!product.batches) return 0;
  return product.batches.reduce((sum, batch) => sum + batch.qty, 0);
}
