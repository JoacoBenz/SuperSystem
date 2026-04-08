import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.purchase_request.create'] },
  async (request, ctx) => {
    const { query } = ctx;
    const search = query.get('search') ?? '';

    const where: Record<string, unknown> = {
      userId: ctx.session.userId,
    };

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const items = await ctx.db.procurementSavedItem.findMany({
      where: where as any,
      orderBy: [{ useCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: 20,
    });

    return ok(items);
  },
);
