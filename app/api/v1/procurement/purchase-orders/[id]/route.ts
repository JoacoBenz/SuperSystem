import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_order.read', 'procurement.purchase_order.create'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const po = await ctx.db.purchaseOrder.findUnique({
      where: { id },
      include: {
        purchaseRequest: {
          include: {
            items: true,
            vendor: true,
            costCenter: true,
          },
        },
        vendor: true,
      },
    });
    if (!po || po.deletedAt) throw new ApiError('NOT_FOUND', 'Purchase order not found', 404);
    return ok(po);
  },
);
