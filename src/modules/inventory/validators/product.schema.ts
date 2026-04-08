import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(2).max(255),
  description: z.string().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  unitOfMeasure: z.string().max(50).default('units'),
  minStock: z.number().nonnegative().optional().nullable(),
  maxStock: z.number().nonnegative().optional().nullable(),
  costPrice: z.number().nonnegative().optional().nullable(),
  salePrice: z.number().nonnegative().optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;
