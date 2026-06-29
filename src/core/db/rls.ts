/**
 * Row-Level-Security plumbing.
 *
 * RLS is defense-in-depth on top of the app-layer tenant filtering. It only takes
 * effect when (a) the app connects as the non-superuser `app_user` role and (b) the
 * per-request tenant GUC is set. Both are coordinated at deploy time, so the whole
 * thing is behind a flag (default OFF) — the policies and code can land safely while
 * the app still connects as the privileged role, then flip on after verification.
 * See docs/DEPLOYMENT.md.
 */
export const RLS_ENABLED = process.env.RLS_ENABLED === 'true';

interface RawClient {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
}

/**
 * Binds `app.tenant_id` for the current transaction. MUST be transaction-local
 * (set_config third arg = true) — under Supavisor/PgBouncer transaction pooling a
 * session-level SET would bleed into the next client to borrow the connection.
 */
export function setTenantGuc(client: RawClient, tenantId: number): Promise<unknown> {
  return client.$executeRawUnsafe("SELECT set_config('app.tenant_id', $1, true)", String(tenantId));
}
