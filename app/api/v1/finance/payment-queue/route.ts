import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';

export const GET = withAuth(
  { moduleId: 'finance', permissionsAny: ['finance.payment.read'] },
  async (request, ctx) => {
    const prs = await ctx.db.purchaseRequest.findMany({
      where: {
        deletedAt: null,
        status: { in: ['in_procurement', 'payment_scheduled'] },
      },
      include: {
        vendor: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true } },
        orders: {
          select: { id: true, totalAmount: true, paymentMethod: true, purchaseDate: true },
        },
        items: { select: { id: true } },
      },
      orderBy: [
        { scheduledPaymentDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return ok(prs.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      status: pr.status,
      estimatedTotal: pr.estimatedTotal ? Number(pr.estimatedTotal) : null,
      scheduledPaymentDate: pr.scheduledPaymentDate,
      vendor: pr.vendor,
      costCenter: pr.costCenter,
      itemCount: (pr.items as any[]).length,
      hasPO: (pr.orders as any[]).length > 0,
    })));
  },
);
