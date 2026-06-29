import { z } from 'zod';

/**
 * Runtime environment validation. Called once at server start (see instrumentation.ts).
 * In production a missing/invalid required secret fails fast; in dev it only warns so
 * local work with placeholder values isn't blocked.
 */
const requiredSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith('postgres'), 'must be a postgres connection string'),
  NEXTAUTH_SECRET: z.string().min(16, 'must be at least 16 characters'),
});

// Recommended in production; warned (not fatal) if absent.
const recommendedKeys = ['DIRECT_URL', 'NEXTAUTH_URL', 'ENCRYPTION_KEY'] as const;

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const result = requiredSchema.safeParse(process.env);

  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    if (isProd) {
      throw new Error(`Invalid environment configuration: ${msg}`);
    }
    console.warn(`[env] configuration warnings: ${msg}`);
  }

  const missing = recommendedKeys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`[env] recommended variables not set: ${missing.join(', ')}`);
  }
}
