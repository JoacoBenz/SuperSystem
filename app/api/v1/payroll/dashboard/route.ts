import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'payroll', permissions: ['payroll.dashboard.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const [runs, totalEmployees] = await Promise.all([
      (prisma as any).payrollRun.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          period: true,
          name: true,
          status: true,
          totalNet: true,
          currency: true,
          _count: { select: { entries: true } },
        },
      }),
      prisma.user.count({ where: { tenantId, active: true } }),
    ]);

    const totalPaidThisYear = await (prisma as any).payrollRun.aggregate({
      where: {
        tenantId,
        status: 'paid',
        period: { startsWith: new Date().getFullYear().toString() },
      },
      _sum: { totalNet: true },
    });

    const allRuns = await (prisma as any).payrollRun.findMany({
      where: { tenantId },
      select: { id: true, period: true, status: true, totalNet: true },
      orderBy: { period: 'desc' },
    });

    return ok({
      totalEmployees,
      recentRuns: runs.map((r: any) => ({
        ...r,
        totalNet: Number(r.totalNet),
        employeeCount: r._count.entries,
      })),
      totalPaidThisYear: Number(totalPaidThisYear._sum?.totalNet ?? 0),
      runCount: allRuns.length,
      byStatus: {
        draft: allRuns.filter((r: any) => r.status === 'draft').length,
        processing: allRuns.filter((r: any) => r.status === 'processing').length,
        approved: allRuns.filter((r: any) => r.status === 'approved').length,
        paid: allRuns.filter((r: any) => r.status === 'paid').length,
      },
    });
  },
);
