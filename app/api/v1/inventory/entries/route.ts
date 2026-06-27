import { withAuth } from '@/src/core/api/handler';
import { paginated } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'inventory', permissionsAny: ['inventory.stock_entry.read'] },
  async (request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const page = parseInt(ctx.query.get('page') ?? '1');
    const limit = parseInt(ctx.query.get('limit') ?? '20');
    const skip = (page - 1) * limit;
    const description = ctx.query.get('description');
    const conforming = ctx.query.get('conforming');

    const where: Record<string, unknown> = { tenantId };
    if (description) where.description = { contains: description, mode: 'insensitive' };
    if (conforming !== null && conforming !== undefined && conforming !== '') {
      where.conforming = conforming === 'true';
    }

    const [total, rows] = await Promise.all([
      prisma.stockEntry.count({ where: where as any }),
      prisma.stockEntry.findMany({
        where: where as any,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return paginated(
      rows.map(r => ({ ...r, quantity: Number(r.quantity), unitCost: r.unitCost ? Number(r.unitCost) : null })),
      total,
      page,
      limit,
    );
  },
);
