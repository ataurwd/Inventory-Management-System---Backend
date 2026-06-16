import mongoose from 'mongoose';
import { Brand } from './brand.model';
import { Product } from '../products/product.model';
import { ApiError } from '../../utils/api-error.util';

export async function getAllBrands() {
  const brands = await Brand.find().sort({ name: 1 });
  const enriched = [];
  
  for (const b of brands) {
    const productCount = await Product.countDocuments({
      brand: b.name,
      isDeleted: false,
    });
    enriched.push({
      _id: b._id,
      name: b.name,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      productCount,
    });
  }
  
  return enriched;
}

export async function createBrand(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw ApiError.badRequest('Brand name cannot be empty');
  }

  // Check for duplicate brand
  const existingBrand = await Brand.findOne({ name: { $regex: `^${trimmedName}$`, $options: 'i' } });
  if (existingBrand) {
    throw ApiError.conflict('Brand already exists');
  }

  const brand = new Brand({ name: trimmedName });
  await brand.save();
  return brand;
}

export async function updateBrand(id: string, name: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid brand ID');
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw ApiError.badRequest('Brand name cannot be empty');
  }

  const brand = await Brand.findById(id);
  if (!brand) {
    throw ApiError.notFound('Brand not found');
  }

  // Check if target name matches old name (ignoring case)
  if (brand.name.toLowerCase() === trimmedName.toLowerCase()) {
    brand.name = trimmedName;
    await brand.save();
    return brand;
  }

  // Check if another brand has the same name
  const existingBrand = await Brand.findOne({ name: { $regex: `^${trimmedName}$`, $options: 'i' } });
  if (existingBrand) {
    throw ApiError.conflict('Brand name already exists');
  }

  const oldName = brand.name;

  // Perform cascade update on all matching products
  await Product.updateMany(
    { brand: oldName },
    { brand: trimmedName }
  );

  brand.name = trimmedName;
  await brand.save();
  return brand;
}

export async function deleteBrand(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid brand ID');
  }

  const brand = await Brand.findById(id);
  if (!brand) {
    throw ApiError.notFound('Brand not found');
  }

  // Count products assigned to this brand
  const productCount = await Product.countDocuments({
    brand: brand.name,
    isDeleted: false,
  });

  if (productCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete brand "${brand.name}" because it is currently assigned to ${productCount} product(s).`
    );
  }

  await Brand.deleteOne({ _id: id });
  return { success: true };
}
