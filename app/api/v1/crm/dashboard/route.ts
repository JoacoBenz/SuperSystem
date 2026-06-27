import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.dashboard.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const [
      totalContacts,
      totalCompanies,
      totalOpportunities,
      openOpportunities,
      byStageRaw,
      recentOpportunities,
    ] = await Promise.all([
      (prisma as any).crmContact.count({ where: { tenantId, active: true } }),
      (prisma as any).crmCompany.count({ where: { tenantId, active: true } }),
      (prisma as any).crmOpportunity.count({ where: { tenantId } }),
      (prisma as any).crmOpportunity.findMany({
        where: { tenantId, stage: { notIn: ['won', 'lost'] } },
        select: { value: true },
      }),
      (prisma as any).crmOpportunity.groupBy({
        by: ['stage'],
        where: { tenantId },
        _count: { id: true },
        _sum: { value: true },
      }),
      (prisma as any).crmOpportunity.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          stage: true,
          value: true,
          createdAt: true,
          company: { select: { name: true } },
        },
      }),
    ]);

    const openPipelineValue = openOpportunities.reduce(
      (sum: number, o: any) => sum + (o.value ? Number(o.value) : 0),
      0,
    );

    const byStage: Record<string, { count: number; value: number }> = {};
    for (const row of byStageRaw) {
      byStage[row.stage] = {
        count: row._count.id,
        value: row._sum.value ? Number(row._sum.value) : 0,
      };
    }

    return ok({
      totalContacts,
      totalCompanies,
      totalOpportunities,
      openPipelineValue,
      byStage,
      recentOpportunities: recentOpportunities.map((o: any) => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        value: o.value ? Number(o.value) : null,
        company: o.company,
        createdAt: o.createdAt,
      })),
    });
  },
);
