import { withAuth } from '@/src/core/api/handler';
import { paginated, ok } from '@/src/core/api/response';

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const { db, session, query } = ctx;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '20');
    const unreadOnly = query.get('unread') === 'true';

    const where: Record<string, unknown> = { recipientId: session.userId };
    if (unreadOnly) where.read = false;

    if (query.get('count_only') === 'true') {
      const count = await db.notification.count({ where: where as any });
      return ok({ count });
    }

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where: where as any }),
    ]);

    return paginated(data, total, page, pageSize);
  },
);
