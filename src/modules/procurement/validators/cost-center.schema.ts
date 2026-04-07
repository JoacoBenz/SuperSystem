import { z } from 'zod';

export const costCenterSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(1).max(20),
  annualBudget: z.number().positive().optional().nullable(),
  monthlyBudget: z.number().positive().optional().nullable(),
});

export type CostCenterInput = z.infer<typeof costCenterSchema>;
