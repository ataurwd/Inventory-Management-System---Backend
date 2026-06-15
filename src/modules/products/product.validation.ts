import { z } from 'zod';

const BatchValidationSchema = z.object({
  batch_no: z.string().min(1, 'Batch number is required'),
  qty: z.number().nonnegative('Quantity cannot be negative'),
  expiry_date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date({ required_error: 'Expiry date is required' })),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  costPrice: z.number().nonnegative('Cost price cannot be negative'),
  sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  safetyStockLevel: z.number().nonnegative('Safety stock level cannot be negative').default(0),
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid supplier ID').nullable().optional(),
  batches: z.array(BatchValidationSchema).optional().default([]),
});

export const UpdateProductSchema = CreateProductSchema.partial();
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
