import mongoose from 'mongoose';
import { Category } from './category.model';
import { Product } from '../products/product.model';
import { ApiError } from '../../utils/api-error.util';

export async function getAllCategories() {
  const categories = await Category.find().sort({ name: 1 });
  const enriched = [];
  
  for (const cat of categories) {
    const productCount = await Product.countDocuments({
      category: cat.name,
      isDeleted: false,
    });
    enriched.push({
      _id: cat._id,
      name: cat.name,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      productCount,
    });
  }
  
  return enriched;
}

export async function createCategory(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw ApiError.badRequest('Category name cannot be empty');
  }

  // Check for duplicate category
  const existingCategory = await Category.findOne({ name: { $regex: `^${trimmedName}$`, $options: 'i' } });
  if (existingCategory) {
    throw ApiError.conflict('Category already exists');
  }

  const category = new Category({ name: trimmedName });
  await category.save();
  return category;
}

export async function updateCategory(id: string, name: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid category ID');
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw ApiError.badRequest('Category name cannot be empty');
  }

  const category = await Category.findById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  // Check if target name matches old name (ignoring case)
  if (category.name.toLowerCase() === trimmedName.toLowerCase()) {
    category.name = trimmedName;
    await category.save();
    return category;
  }

  // Check if another category has the same name
  const existingCategory = await Category.findOne({ name: { $regex: `^${trimmedName}$`, $options: 'i' } });
  if (existingCategory) {
    throw ApiError.conflict('Category name already exists');
  }

  const oldName = category.name;

  // Perform cascade update on all matching products
  await Product.updateMany(
    { category: oldName },
    { category: trimmedName }
  );

  category.name = trimmedName;
  await category.save();
  return category;
}

export async function deleteCategory(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid category ID');
  }

  const category = await Category.findById(id);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  // Count products assigned to this category
  const productCount = await Product.countDocuments({
    category: category.name,
    isDeleted: false,
  });

  if (productCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete category "${category.name}" because it is currently assigned to ${productCount} product(s).`
    );
  }

  await Category.deleteOne({ _id: id });
  return { success: true };
}
