import { z } from 'zod';

export const receptionSchema = z.object({
  purchaseRequestId: z.number().int().positive(),
  conforming: z.boolean(),
  issueType: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    purchaseRequestItemId: z.number().int().positive(),
    quantityReceived: z.number().min(0),
    conforming: z.boolean().default(true),
    notes: z.string().optional().nullable(),
  })).optional(),
}).refine(
  data => data.conforming || (data.issueType && data.notes && data.notes.length >= 10),
  { message: 'Non-conforming receptions require issue type and notes (min 10 chars)' },
);

export type ReceptionInput = z.infer<typeof receptionSchema>;
