import { withAuth } from '@/src/core/api/handler';
import { ok, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { z } from 'zod';

const createDelegationSchema = z.object({
  delegateId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  startDate: z.string().refine(s => !isNaN(Date.parse(s))),
  endDate: z.string().refine(s => !isNaN(Date.parse(s))),
  reason: z.string().max(255).optional(),
});

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const isAdmin = ctx.session.orgRole === 'admin' || ctx.session.orgRole === 'super_admin';
    const where: Record<string, unknown> = {};
    if (!isAdmin) {
      where.OR = [{ delegatorId: ctx.session.userId }, { delegateId: ctx.session.userId }];
    }

    const delegations = await ctx.db.delegation.findMany({
      where: where as any,
      include: {
        delegator: { select: { id: true, name: true, email: true } },
        delegate: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok(delegations);
  },
);

export const POST = withAuth(
  { body: createDelegationSchema },
  async (request, ctx) => {
    const { delegateId, roleId, startDate, endDate, reason } = ctx.body;

    if (delegateId === ctx.session.userId) {
      throw new ApiError('BAD_REQUEST', 'Cannot delegate to yourself', 400);
    }
    if (new Date(endDate) < new Date(startDate)) {
      throw new ApiError('BAD_REQUEST', 'End date must be after start date', 400);
    }

    const [delegate, role] = await Promise.all([
      ctx.db.user.findUnique({ where: { id: delegateId } }),
      ctx.db.role.findUnique({ where: { id: roleId } }),
    ]);
    if (!delegate || delegate.deletedAt) throw new ApiError('NOT_FOUND', 'Delegate user not found', 404);
    if (!role) throw new ApiError('NOT_FOUND', 'Role not found', 404);

    const delegation = await ctx.db.delegation.create({
      data: {
        tenantId: ctx.session.tenantId,
        delegatorId: ctx.session.userId,
        delegateId,
        roleId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason ?? null,
        active: true,
      } as any,
      include: {
        delegator: { select: { id: true, name: true, email: true } },
        delegate: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true, displayName: true } },
      },
    });
    return created(delegation);
  },
);
