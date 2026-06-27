import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.dashboard.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const [totalCustomers, totalOrders, recentOrders, byStatus, revenueAggregate] = await Promise.all([
      (prisma as any).customer.count({ where: { tenantId, active: true } }),
      (prisma as any).salesOrder.count({ where: { tenantId } }),
      (prisma as any).salesOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: { select: { id: true, name: true } } },
      }),
      (prisma as any).salesOrder.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      (prisma as any).salesOrder.aggregate({
        where: { tenantId, status: { in: ['confirmed', 'shipped', 'delivered'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    const statusMap: Record<string, { count: number; total: number }> = {};
    for (const s of byStatus) {
      statusMap[s.status] = { count: s._count.id, total: Number(s._sum?.totalAmount ?? 0) };
    }

    return ok({
      totalCustomers,
      totalOrders,
      confirmedRevenue: Number(revenueAggregate._sum?.totalAmount ?? 0),
      byStatus: statusMap,
      recentOrders: recentOrders.map((o: any) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
      })),
    });
  },
);
