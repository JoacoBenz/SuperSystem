import { withAuth } from '@/src/core/api/handler';
import { paginated } from '@/src/core/api/response';
import { apiError } from '@/src/core/api/errors';

export const GET = withAuth(
  {},
  async (request, ctx) => {
    if (ctx.session.orgRole !== 'admin' && ctx.session.orgRole !== 'super_admin') {
      return apiError('FORBIDDEN', 'Only admins can access audit logs', 403);
    }
    const { db, query } = ctx;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '50');

    const where: Record<string, unknown> = {};
    const moduleId = query.get('module');
    const resource = query.get('resource');
    const userId = query.get('userId');
    const eventType = query.get('eventType');
    const from = query.get('from');
    const to = query.get('to');

    if (moduleId) where.moduleId = moduleId;
    if (resource) where.resource = resource;
    if (userId) where.userId = parseInt(userId);
    if (eventType) where.eventType = eventType;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      db.auditLog.findMany({
        where: where as any,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where: where as any }),
    ]);

    // Log this data access
    ctx.audit.log({
      action: 'read', resource: 'audit_log', eventType: 'data_access',
      metadata: { filters: { moduleId, resource, userId, eventType, from, to }, resultCount: total },
    }).catch(() => {});

    return paginated(data, total, page, pageSize);
  },
);
