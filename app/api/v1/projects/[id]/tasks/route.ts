import { z } from 'zod';
import { withAuth } from '@/src/core/api/handler';
import { created, paginated } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assigneeId: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().optional(),
});

export const GET = withAuth(
  { moduleId: 'projects', permissions: ['projects.task.read'] },
  async (request, ctx) => {
    const { session, params, query } = ctx;
    const tenantId = session.tenantId;
    const projectId = parseInt(params.id, 10);

    const project = await (prisma as any).project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) {
      return apiError('NOT_FOUND', 'Project not found', 404);
    }

    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const status = query.get('status');

    const where: Record<string, unknown> = { tenantId, projectId };
    if (status) where.status = status;

    const [tasks, total] = await Promise.all([
      (prisma as any).task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          timeEntries: {
            select: { hours: true },
          },
        },
      }),
      (prisma as any).task.count({ where }),
    ]);

    const data = (tasks as any[]).map((t: any) => {
      const totalHours = (t.timeEntries as any[]).reduce(
        (sum: number, e: any) => sum + Number(e.hours),
        0,
      );
      return {
        ...t,
        estimatedHours: t.estimatedHours != null ? Number(t.estimatedHours) : null,
        totalHoursLogged: totalHours,
        timeEntries: undefined,
      };
    });

    return paginated(data, total, page, limit);
  },
);

export const POST = withAuth(
  { moduleId: 'projects', permissions: ['projects.task.manage'], body: createTaskSchema },
  async (request, ctx) => {
    const { body, session, params } = ctx;
    const tenantId = session.tenantId;
    const projectId = parseInt(params.id, 10);

    const project = await (prisma as any).project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) {
      return apiError('NOT_FOUND', 'Project not found', 404);
    }

    const task = await (prisma as any).task.create({
      data: {
        tenantId,
        projectId,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        priority: body.priority,
        assigneeId: body.assigneeId ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        estimatedHours: body.estimatedHours ?? null,
        createdBy: session.userId,
      },
    });

    return created({
      ...task,
      estimatedHours: task.estimatedHours != null ? Number(task.estimatedHours) : null,
    });
  },
);
