import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.dashboard.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalAccounts,
      activeBalances,
      reconciledCount,
      pendingCount,
      recentTransactions,
    ] = await Promise.all([
      (prisma as any).bankAccount.count({ where: { tenantId } }),
      (prisma as any).bankAccount.findMany({
        where: { tenantId, isActive: true },
        select: { balance: true },
      }),
      (prisma as any).bankTransaction.count({
        where: {
          tenantId,
          reconciled: true,
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
      (prisma as any).bankTransaction.count({
        where: {
          tenantId,
          reconciled: false,
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
      (prisma as any).bankTransaction.findMany({
        where: { tenantId },
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          bankAccount: { select: { name: true } },
        },
      }),
    ]);

    const totalBalance = activeBalances.reduce(
      (sum: number, a: any) => sum + Number(a.balance),
      0,
    );

    return ok({
      totalAccounts,
      totalBalance,
      reconciledCount,
      pendingCount,
      recentTransactions: recentTransactions.map((t: any) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        reconciled: t.reconciled,
        accountName: t.bankAccount?.name ?? null,
      })),
    });
  },
);
