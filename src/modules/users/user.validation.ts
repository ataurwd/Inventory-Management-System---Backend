import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
  role: z.enum(['admin', 'manager', 'cashier']).default('cashier'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
    .optional(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'manager', 'cashier']).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

