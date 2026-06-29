import { prisma } from '@/src/core/db/client';

// Durable, cross-instance rate limiting backed by Postgres. The previous in-memory Map
// reset on every serverless invocation, so it didn't actually limit anything on Vercel.

const p = prisma as unknown as {
  $queryRawUnsafe: (q: string, ...v: unknown[]) => Promise<Array<{ count: number | bigint; reset_at: string | Date }>>;
  $executeRawUnsafe: (q: string, ...v: unknown[]) => Promise<number>;
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Atomic check-and-increment over a sliding fixed window. Fails OPEN: if the limiter
 * store is unreachable we allow the request rather than lock everyone out.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const rows = await p.$queryRawUnsafe(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + ($2::bigint * interval '1 millisecond'))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= now()
                         THEN now() + ($2::bigint * interval '1 millisecond')
                         ELSE rate_limits.reset_at END
       RETURNING count, reset_at`,
      key,
      windowMs,
    );
    const count = Number(rows[0].count);
    const resetAt = new Date(rows[0].reset_at).getTime();
    return { allowed: count <= maxAttempts, remaining: Math.max(0, maxAttempts - count), resetAt };
  } catch {
    return { allowed: true, remaining: maxAttempts, resetAt: Date.now() + windowMs };
  }
}

/** Clears a counter (e.g. on successful login). Best-effort. */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await p.$executeRawUnsafe('DELETE FROM rate_limits WHERE key = $1', key);
  } catch {
    /* best-effort */
  }
}

/** Reads a counter without incrementing (expired windows treated as absent). */
export async function peekRateLimit(key: string): Promise<{ count: number; resetAt: number } | null> {
  try {
    const rows = await p.$queryRawUnsafe(
      'SELECT count, reset_at FROM rate_limits WHERE key = $1 AND reset_at > now()',
      key,
    );
    if (!rows.length) return null;
    return { count: Number(rows[0].count), resetAt: new Date(rows[0].reset_at).getTime() };
  } catch {
    return null;
  }
}
