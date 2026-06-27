import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { z } from 'zod';

const updateDelegationSchema = z.object({
  active: z.boolean(),
});

export const PATCH = withAuth(
  { body: updateDelegationSchema },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const delegation = await ctx.db.delegation.findUnique({ where: { id } });
    if (!delegation) throw new ApiError('NOT_FOUND', 'Delegation not found', 404);

    const isAdmin = ctx.session.orgRole === 'admin' || ctx.session.orgRole === 'super_admin';
    if (!isAdmin && delegation.delegatorId !== ctx.session.userId) {
      throw new ApiError('FORBIDDEN', 'You can only modify your own delegations', 403);
    }

    const updated = await ctx.db.delegation.update({
      where: { id },
      data: { active: ctx.body.active },
      include: {
        delegator: { select: { id: true, name: true } },
        delegate: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, displayName: true } },
      },
    });
    return ok(updated);
  },
);
