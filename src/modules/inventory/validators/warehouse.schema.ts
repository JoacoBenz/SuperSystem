import { z } from 'zod';

export const warehouseSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(1).max(50),
  address: z.string().max(500).optional().nullable(),
  managerId: z.number().int().positive().optional().nullable(),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
