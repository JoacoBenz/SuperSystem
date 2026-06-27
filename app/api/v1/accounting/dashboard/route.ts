import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.report.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const [
      totalAccounts,
      assetAgg,
      liabilityAgg,
      equityAgg,
      draftJournals,
      postedJournals,
      recentJournals,
    ] = await Promise.all([
      (prisma as any).chartOfAccount.count({ where: { tenantId } }),
      (prisma as any).chartOfAccount.aggregate({
        where: { tenantId, type: 'asset' },
        _sum: { balance: true },
      }),
      (prisma as any).chartOfAccount.aggregate({
        where: { tenantId, type: 'liability' },
        _sum: { balance: true },
      }),
      (prisma as any).chartOfAccount.aggregate({
        where: { tenantId, type: 'equity' },
        _sum: { balance: true },
      }),
      (prisma as any).journalEntry.count({ where: { tenantId, status: 'draft' } }),
      (prisma as any).journalEntry.count({ where: { tenantId, status: 'posted' } }),
      (prisma as any).journalEntry.findMany({
        where: { tenantId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        include: { _count: { select: { lines: true } } },
      }),
    ]);

    return ok({
      totalAccounts,
      totalAssets: assetAgg._sum.balance ?? 0,
      totalLiabilities: liabilityAgg._sum.balance ?? 0,
      totalEquity: equityAgg._sum.balance ?? 0,
      draftJournals,
      postedJournals,
      recentJournals: recentJournals.map((e: any) => ({
        ...e,
        lineCount: e._count.lines,
        _count: undefined,
      })),
    });
  },
);
