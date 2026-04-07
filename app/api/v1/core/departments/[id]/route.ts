import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { notFound } from '@/src/core/api/errors';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  managerId: z.number().int().positive().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
});

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const dept = await ctx.db.department.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        users: { select: { id: true, name: true, email: true }, where: { active: true, deletedAt: null } },
      },
    });
    if (!dept || dept.deletedAt) return notFound('Department');
    return ok(dept);
  },
);

export const PATCH = withAuth(
  { permissions: ['core.department.manage'], body: updateDepartmentSchema },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const existing = await ctx.db.department.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return notFound('Department');

    const dept = await ctx.db.department.update({
      where: { id },
      data: ctx.body as any,
    });

    await ctx.audit.log({
      action: 'update', resource: 'department', resourceId: id,
      previousData: { name: existing.name },
      newData: { name: dept.name },
    });

    return ok(dept);
  },
);

export const DELETE = withAuth(
  { permissions: ['core.department.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const existing = await ctx.db.department.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return notFound('Department');

    await ctx.db.department.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    return ok({ message: 'Department deleted' });
  },
);
