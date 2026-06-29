// Collision-safe per-tenant document numbering.
//
// Replaces the old `count() + 1` pattern, which races: two concurrent creates both read
// N and both write N+1, colliding on the unique number. A dedicated counter row is
// bumped atomically (UPDATE ... RETURNING / INSERT ... ON CONFLICT DO UPDATE), so even
// under serverless concurrency every caller gets a distinct value.

type Client = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface NumberOptions {
  prefix: string;
  pad: number;
  /**
   * Computes the starting value the first time a (tenant, docType) counter is created,
   * so numbering continues past documents that existed before the counter. Typically the
   * current count/max for that document type. Only invoked on first use.
   */
  seed?: () => Promise<number> | number;
}

export async function nextDocumentNumber(
  client: Client,
  tenantId: number,
  docType: string,
  opts: NumberOptions,
): Promise<string> {
  // Fast path: atomically bump an existing counter.
  const bumped = (await client.$queryRawUnsafe(
    'UPDATE document_counters SET value = value + 1 WHERE tenant_id = $1 AND doc_type = $2 RETURNING value',
    tenantId,
    docType,
  )) as Array<{ value: number | bigint }>;

  let value: number;
  if (Array.isArray(bumped) && bumped.length > 0) {
    value = Number(bumped[0].value);
  } else {
    // First use for this (tenant, docType): seed from existing data so we don't reuse a
    // number that predates the counter. ON CONFLICT covers the concurrent-first-use race.
    const seed = opts.seed ? Number(await opts.seed()) : 0;
    const created = (await client.$queryRawUnsafe(
      `INSERT INTO document_counters (tenant_id, doc_type, value) VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, doc_type) DO UPDATE SET value = document_counters.value + 1
       RETURNING value`,
      tenantId,
      docType,
      seed + 1,
    )) as Array<{ value: number | bigint }>;
    value = Number(created[0].value);
  }

  return opts.prefix + String(value).padStart(opts.pad, '0');
}
