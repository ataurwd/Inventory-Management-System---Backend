import { Supplier, ISupplier } from './supplier.model';
import { ApiError } from '../../utils/api-error.util';

export async function createSupplier(data: Partial<ISupplier>) {
  const supplier = new Supplier(data);
  await supplier.save();
  return supplier;
}

export async function getAllSuppliers() {
  return Supplier.find({ isDeleted: false }).sort({ createdAt: -1 });
}

export async function getSupplierById(id: string) {
  const supplier = await Supplier.findOne({ _id: id, isDeleted: false });
  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }
  return supplier;
}

export async function updateSupplier(id: string, data: Partial<ISupplier>) {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }

  return supplier;
}

export async function deleteSupplier(id: string) {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }

  return supplier;
}
