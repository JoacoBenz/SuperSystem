import { z } from 'zod';

export const stockMovementSchema = z.object({
  productId: z.number().int().positive(),
  warehouseFromId: z.number().int().positive().optional().nullable(),
  warehouseToId: z.number().int().positive().optional().nullable(),
  quantity: z.number().positive(),
  movementType: z.enum(['receipt', 'issue', 'transfer', 'adjustment', 'return']),
  referenceType: z.string().max(100).optional().nullable(),
  referenceId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
