import { z } from 'zod';

const SoldProductValidationSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  name: z.string().min(1, 'Product name is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  qty: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
});

export const CreateSaleSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional().default(''),
  products: z.array(SoldProductValidationSchema).min(1, 'Sale must contain at least one product'),
  discount: z.number().nonnegative('Discount cannot be negative').optional().default(0),
  tax: z.number().nonnegative('Tax cannot be negative').optional().default(0),
  paidAmount: z.number().nonnegative('Paid amount cannot be negative').optional().default(0),
  saleStatus: z.enum(['completed', 'draft', 'canceled']).optional().default('completed'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'mobile_banking', 'other']).optional().default('cash'),
  notes: z.string().optional().default(''),
});

export const UpdateSaleSchema = CreateSaleSchema.partial();

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type UpdateSaleInput = z.infer<typeof UpdateSaleSchema>;
