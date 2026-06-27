import { z } from 'zod';
import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  budget: z.number().positive().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const GET = withAuth(
  { moduleId: 'projects', permissions: ['projects.project.read'] },
  async (request, ctx) => {
    const { session, params } = ctx;
    const id = parseInt(params.id, 10);
    const tenantId = session.tenantId;

    const project = await (prisma as any).project.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            dueDate: true,
            estimatedHours: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      return apiError('NOT_FOUND', 'Project not found', 404);
    }

    return ok({
      ...project,
      budget: project.budget != null ? Number(project.budget) : null,
      taskCount: project._count?.tasks ?? 0,
      _count: undefined,
      tasks: (project.tasks as any[]).map((t: any) => ({
        ...t,
        estimatedHours: t.estimatedHours != null ? Number(t.estimatedHours) : null,
      })),
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'projects', permissions: ['projects.project.manage'], body: updateProjectSchema },
  async (request, ctx) => {
    const { body, session, params } = ctx;
    const id = parseInt(params.id, 10);
    const tenantId = session.tenantId;

    const existing = await (prisma as any).project.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Project not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.budget !== undefined) updateData.budget = body.budget;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;

    const project = await (prisma as any).project.update({
      where: { id },
      data: updateData,
    });

    return ok({
      ...project,
      budget: project.budget != null ? Number(project.budget) : null,
    });
  },
);
