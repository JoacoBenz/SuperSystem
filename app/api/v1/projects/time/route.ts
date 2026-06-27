import { z } from 'zod';
import { withAuth } from '@/src/core/api/handler';
import { created, paginated } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';

const createTimeEntrySchema = z.object({
  taskId: z.number().int().positive('Task is required'),
  hours: z.number().positive('Hours must be greater than 0'),
  date: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
});

export const GET = withAuth(
  { moduleId: 'projects', permissions: ['projects.time_entry.read'] },
  async (request, ctx) => {
    const { session, query } = ctx;
    const tenantId = session.tenantId;

    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const taskId = query.get('taskId');

    const where: Record<string, unknown> = { tenantId };
    if (taskId) where.taskId = parseInt(taskId, 10);

    const [entries, total] = await Promise.all([
      (prisma as any).timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      }),
      (prisma as any).timeEntry.count({ where }),
    ]);

    const data = (entries as any[]).map((e: any) => ({
      ...e,
      hours: Number(e.hours),
    }));

    return paginated(data, total, page, limit);
  },
);

export const POST = withAuth(
  { moduleId: 'projects', permissions: ['projects.time_entry.manage'], body: createTimeEntrySchema },
  async (request, ctx) => {
    const { body, session } = ctx;
    const tenantId = session.tenantId;

    // Verify task belongs to this tenant
    const task = await (prisma as any).task.findFirst({
      where: { id: body.taskId, tenantId },
    });
    if (!task) {
      return apiError('NOT_FOUND', 'Task not found', 404);
    }

    const entry = await (prisma as any).timeEntry.create({
      data: {
        tenantId,
        taskId: body.taskId,
        userId: session.userId,
        hours: body.hours,
        date: body.date ? new Date(body.date) : new Date(),
        description: body.description ?? null,
      },
    });

    return created({
      ...entry,
      hours: Number(entry.hours),
    });
  },
);
