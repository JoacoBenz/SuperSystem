import { withAuth } from '@/src/core/api/handler';
import { paginated } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'projects', permissions: ['projects.task.read'] },
  async (request, ctx) => {
    const { session, query } = ctx;
    const tenantId = session.tenantId;

    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const status = query.get('status');
    const projectId = query.get('projectId');

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (projectId) where.projectId = parseInt(projectId, 10);

    const [tasks, total] = await Promise.all([
      (prisma as any).task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, name: true } },
          timeEntries: { select: { hours: true } },
        },
      }),
      (prisma as any).task.count({ where }),
    ]);

    const data = (tasks as any[]).map((t: any) => {
      const totalHoursLogged = (t.timeEntries as any[]).reduce(
        (sum: number, e: any) => sum + Number(e.hours),
        0,
      );
      return {
        ...t,
        estimatedHours: t.estimatedHours != null ? Number(t.estimatedHours) : null,
        totalHoursLogged,
        timeEntries: undefined,
      };
    });

    return paginated(data, total, page, limit);
  },
);
