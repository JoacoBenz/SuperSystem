import { z } from 'zod';

export const productCategorySchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
});

export type ProductCategoryInput = z.infer<typeof productCategorySchema>;
