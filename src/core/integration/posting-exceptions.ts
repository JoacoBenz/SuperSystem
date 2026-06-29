import { prisma } from '@/src/core/db/client';

/**
 * Records a cross-module posting that quietly no-opped (a missing chart of accounts,
 * no active bank account, etc.) so it surfaces in a "postings needing attention" list
 * instead of vanishing. Best-effort and isolated: it writes on its own connection (not
 * the caller's transaction, so a posting rollback doesn't erase the record) and never
 * throws — logging a problem must never cause one.
 */
export async function recordPostingException(
  tenantId: number,
  source: string,
  reason: string,
  reference?: string | null,
): Promise<void> {
  try {
    await (prisma as { $executeRawUnsafe: (q: string, ...v: unknown[]) => Promise<number> }).$executeRawUnsafe(
      `INSERT INTO posting_exceptions (tenant_id, source, reference, reason, resolved, created_at)
       VALUES ($1, $2, $3, $4, false, now())`,
      tenantId,
      source,
      reference ?? null,
      reason,
    );
  } catch {
    // Table may not exist yet (pre-migration) or the write may fail — never propagate.
  }
}
