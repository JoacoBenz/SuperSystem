import { z } from 'zod';
import { withAuth } from '@/src/core/api/handler';
import { created, paginated } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  budget: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const GET = withAuth(
  { moduleId: 'projects', permissions: ['projects.project.read'] },
  async (request, ctx) => {
    const { session, query } = ctx;
    const tenantId = session.tenantId;

    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const status = query.get('status');
    const search = query.get('search');

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      (prisma as any).project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { tasks: true } } },
      }),
      (prisma as any).project.count({ where }),
    ]);

    const data = (projects as any[]).map((p: any) => ({
      ...p,
      budget: p.budget != null ? Number(p.budget) : null,
      taskCount: p._count?.tasks ?? 0,
      _count: undefined,
    }));

    return paginated(data, total, page, limit);
  },
);

export const POST = withAuth(
  { moduleId: 'projects', permissions: ['projects.project.manage'], body: createProjectSchema },
  async (request, ctx) => {
    const { body, session } = ctx;
    const tenantId = session.tenantId;

    const project = await (prisma as any).project.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description ?? null,
        status: body.status,
        priority: body.priority,
        budget: body.budget ?? null,
        currency: body.currency,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        createdBy: session.userId,
      },
    });

    return created({
      ...project,
      budget: project.budget != null ? Number(project.budget) : null,
    });
  },
);
