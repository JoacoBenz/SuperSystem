import { z } from 'zod';

export const createPurchaseRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  justification: z.string().min(10, 'Justification must be at least 10 characters'),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  vendorId: z.number().int().positive().optional().nullable(),
  costCenterId: z.number().int().positive().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required').max(255),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().max(50).default('units'),
    estimatedPrice: z.number().positive().optional().nullable(),
    productUrl: z.string().url().max(500).optional().nullable(),
    productId: z.number().int().positive().optional().nullable(),
  })).min(1, 'At least one item is required'),
  action: z.enum(['draft', 'submit']).default('draft'),
});

export const updatePurchaseRequestSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  justification: z.string().min(10).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  vendorId: z.number().int().positive().optional().nullable(),
  costCenterId: z.number().int().positive().optional().nullable(),
  items: z.array(z.object({
    id: z.number().int().positive().optional(),
    description: z.string().min(1).max(255),
    quantity: z.number().positive(),
    unit: z.string().max(50).default('units'),
    estimatedPrice: z.number().positive().optional().nullable(),
    productUrl: z.string().url().max(500).optional().nullable(),
  })).min(1).optional(),
  version: z.number().int().optional(),
});

export const transitionSchema = z.object({
  action: z.string().min(1),
  notes: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  version: z.number().int().optional(),
});

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type UpdatePurchaseRequestInput = z.infer<typeof updatePurchaseRequestSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
