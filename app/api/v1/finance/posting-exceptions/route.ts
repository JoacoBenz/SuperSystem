import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';

/**
 * "Postings needing attention" — cross-module postings that quietly no-opped
 * (missing GL account, no bank account, …). Surfacing these turns the best-effort
 * posting design from silent into observable.
 */
export const GET = withAuth(
  { permissionsAny: ['accounting.journal.read', 'accounting.account.read'] },
  async (_request, ctx) => {
    const includeResolved = ctx.query.get('all') === 'true';
    const rows = await (ctx.db as any).postingException.findMany({
      where: includeResolved ? {} : { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(rows);
  },
);
