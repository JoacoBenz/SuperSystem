import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'finance', permissionsAny: ['finance.report.read'] },
  async (request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalPRs,
      totalSpentAgg,
      pendingPayments,
      scheduledPayments,
      thisMonthSpentAgg,
    ] = await Promise.all([
      prisma.purchaseRequest.count({ where: { tenantId, deletedAt: null } }),
      prisma.purchaseOrder.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseRequest.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['in_procurement', 'payment_scheduled'] },
        },
      }),
      prisma.purchaseRequest.count({
        where: {
          tenantId,
          deletedAt: null,
          status: 'payment_scheduled',
          scheduledPaymentDate: { not: null },
        },
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    let budgetCount = 0;
    try {
      budgetCount = await (ctx.db as any).budget.count({ where: { tenantId } });
    } catch {
      budgetCount = 0;
    }

    return ok({
      totalPRs,
      totalSpent: Number(totalSpentAgg._sum.totalAmount ?? 0),
      pendingPayments,
      scheduledPayments,
      thisMonthSpent: Number(thisMonthSpentAgg._sum.totalAmount ?? 0),
      budgetCount,
    });
  },
);
