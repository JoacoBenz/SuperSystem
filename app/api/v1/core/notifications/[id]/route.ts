import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { notFound } from '@/src/core/api/errors';

export const PATCH = withAuth(
  {},
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const notif = await ctx.db.notification.findUnique({ where: { id } });
    if (!notif || notif.recipientId !== ctx.session.userId) return notFound('Notification');

    const updated = await ctx.db.notification.update({
      where: { id },
      data: { read: true },
    });

    return ok(updated);
  },
);
