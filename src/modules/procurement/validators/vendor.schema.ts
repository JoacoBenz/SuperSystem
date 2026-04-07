import { z } from 'zod';

export const vendorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  taxId: z.string().max(20).optional().nullable(),
  bankDetails: z.string().optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export type VendorInput = z.infer<typeof vendorSchema>;
