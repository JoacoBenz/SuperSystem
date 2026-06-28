import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { computeStatements } from '@/src/modules/accounting/statements';

const p = prisma as any;

/**
 * Financial statements derived live from the General Ledger (chart of accounts,
 * by normal-balance type) plus Treasury for the cash-flow summary.
 * The aggregation lives in `computeStatements` (pure, unit-tested).
 */
export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.report.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;

    const [accounts, banks, txns] = await Promise.all([
      p.chartOfAccount.findMany({ where: { tenantId }, orderBy: { code: 'asc' } }),
      p.bankAccount.findMany({ where: { tenantId, isActive: true }, select: { balance: true } }),
      p.bankTransaction.findMany({ where: { tenantId }, select: { amount: true, type: true } }),
    ]);

    return ok(computeStatements(accounts, banks, txns));
  },
);
