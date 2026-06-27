import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.order.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const order = await (prisma as any).salesOrder.findFirst({
      where: { id, tenantId: ctx.session.tenantId },
      include: {
        customer: true,
        items: { orderBy: { id: 'asc' } },
      },
    });
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
    return ok({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((i: any) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'sales', permissions: ['sales.order.manage'], body: updateSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;

    const order = await (prisma as any).salesOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);

    const updateData: Record<string, unknown> = {};
    if (ctx.body.notes !== undefined) updateData.notes = ctx.body.notes;
    if (ctx.body.status) {
      updateData.status = ctx.body.status;
      if (ctx.body.status === 'confirmed') updateData.confirmedAt = new Date();
      if (ctx.body.status === 'shipped') updateData.shippedAt = new Date();
      if (ctx.body.status === 'delivered') updateData.deliveredAt = new Date();
    }

    const updated = await (prisma as any).salesOrder.update({
      where: { id },
      data: updateData,
      include: { customer: { select: { id: true, name: true } } },
    });

    return ok({ ...updated, totalAmount: Number(updated.totalAmount) });
  },
);
