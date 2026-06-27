import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'budget', permissions: ['budget.dashboard.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const [
      totalBudgets,
      activeBudgets,
      totalPlannedRaw,
      totalActualRaw,
      byStatusRaw,
      recentBudgets,
    ] = await Promise.all([
      (prisma as any).budgetPlan.count({ where: { tenantId } }),
      (prisma as any).budgetPlan.count({ where: { tenantId, status: 'active' } }),
      (prisma as any).budgetPlan.aggregate({
        where: { tenantId, status: 'active' },
        _sum: { totalAmount: true },
      }),
      (prisma as any).budgetPlanItem.aggregate({
        where: {
          tenantId,
          budgetPlan: { status: 'active' },
        },
        _sum: { actualAmount: true },
      }),
      (prisma as any).budgetPlan.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      (prisma as any).budgetPlan.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          fiscalYear: true,
          status: true,
          totalAmount: true,
          currency: true,
        },
      }),
    ]);

    const byStatus = byStatusRaw.map((row: any) => ({
      status: row.status,
      count: row._count.id,
    }));

    return ok({
      totalBudgets,
      activeBudgets,
      totalPlanned: totalPlannedRaw._sum.totalAmount ? Number(totalPlannedRaw._sum.totalAmount) : 0,
      totalActual: totalActualRaw._sum.actualAmount ? Number(totalActualRaw._sum.actualAmount) : 0,
      byStatus,
      recentBudgets: recentBudgets.map((b: any) => ({
        ...b,
        totalAmount: Number(b.totalAmount),
      })),
    });
  },
);
