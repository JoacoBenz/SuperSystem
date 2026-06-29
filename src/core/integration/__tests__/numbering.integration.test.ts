import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/src/core/db/client';
import { nextDocumentNumber } from '../numbering';

// Real-Postgres proof that the document-number counter is collision-safe under
// concurrency (the whole point of replacing count()+1). Requires document_counters to
// exist (CI applies the schema with `prisma db push`).
const T = 99_999;
const db = prisma as unknown as { $executeRawUnsafe: (q: string, ...v: unknown[]) => Promise<unknown> };

describe('nextDocumentNumber (integration, real Postgres)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe('DELETE FROM document_counters WHERE tenant_id = $1', T);
  });
  afterAll(async () => {
    await db.$executeRawUnsafe('DELETE FROM document_counters WHERE tenant_id = $1', T);
  });

  it('produces 50 distinct numbers under concurrent first-use (no collisions)', async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        nextDocumentNumber(prisma, T, 'INV', { prefix: 'INV-', pad: 5, seed: () => 0 }),
      ),
    );
    expect(new Set(results).size).toBe(50);
    expect(results.every((r) => /^INV-\d{5}$/.test(r))).toBe(true);
  });
});
