import { withAuth } from '@/src/core/api/handler';
import { prisma } from '@/src/core/db/client';
import { computeStatements } from '@/src/modules/accounting/statements';
import { renderStatementsDocument } from '@/src/core/documents/document.service';

const p = prisma as any;

export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.report.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const [accounts, banks, txns] = await Promise.all([
      p.chartOfAccount.findMany({ where: { tenantId }, orderBy: { code: 'asc' } }),
      p.bankAccount.findMany({ where: { tenantId, isActive: true }, select: { balance: true } }),
      p.bankTransaction.findMany({ where: { tenantId }, select: { amount: true, type: true } }),
    ]);
    const html = renderStatementsDocument(computeStatements(accounts, banks, txns));
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
);
