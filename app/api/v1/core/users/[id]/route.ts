import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { notFound } from '@/src/core/api/errors';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  departmentId: z.number().int().positive().optional().nullable(),
  orgRole: z.enum(['admin', 'member']).optional(),
  active: z.boolean().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
});

export const GET = withAuth(
  { permissions: ['core.user.read'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
      },
    });
    if (!user || user.deletedAt) return notFound('User');

    const { passwordHash, ...safeUser } = user;
    return ok(safeUser);
  },
);

export const PATCH = withAuth(
  { permissions: ['core.user.manage'], body: updateUserSchema },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const { body, db, audit } = ctx;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return notFound('User');

    const updateData: Record<string, unknown> = { updatedBy: ctx.session.userId };
    if (body.name) updateData.name = body.name;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.orgRole) updateData.orgRole = body.orgRole;
    if (body.active !== undefined) updateData.active = body.active;

    const user = await db.user.update({
      where: { id },
      data: updateData as any,
    });

    // Update roles if provided
    if (body.roleIds) {
      await db.userRole.deleteMany({ where: { userId: id } });
      for (const roleId of body.roleIds) {
        await db.userRole.create({ data: { userId: id, roleId } });
      }
    }

    await audit.log({
      action: 'update', resource: 'user', resourceId: id, eventType: 'permission',
      previousData: { name: existing.name, orgRole: existing.orgRole, active: existing.active },
      newData: { name: user.name, orgRole: user.orgRole, active: user.active },
    });

    const { passwordHash, ...safeUser } = user;
    return ok(safeUser);
  },
);

export const DELETE = withAuth(
  { permissions: ['core.user.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const existing = await ctx.db.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return notFound('User');

    await ctx.db.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await ctx.audit.log({
      action: 'delete', resource: 'user', resourceId: id,
    });

    return ok({ message: 'User deleted' });
  },
);
