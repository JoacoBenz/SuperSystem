import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

const p = prisma as any;
const COGS_RE = /cost of goods/i;
const isCogs = (a: any) => (a.code ?? '').startsWith('51') || COGS_RE.test(a.name ?? '');

/**
 * Financial statements derived live from the General Ledger (chart of accounts,
 * by normal-balance type) plus Treasury for the cash-flow summary.
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

    const num = (v: any) => Number(v ?? 0);
    const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + x.amount, 0);
    const line = (a: any) => ({ code: a.code, name: a.name, amount: num(a.balance) });
    const ofType = (t: string) => accounts.filter((a: any) => a.type === t).map(line);

    // ── Income statement ─────────────────────────────────────────────
    const revenue = ofType('revenue');
    const expenseAccts = accounts.filter((a: any) => a.type === 'expense');
    const cogs = expenseAccts.filter(isCogs).map(line);
    const opex = expenseAccts.filter((a: any) => !isCogs(a)).map(line);

    const totalRevenue = sum(revenue);
    const totalCogs = sum(cogs);
    const totalOpex = sum(opex);
    const grossProfit = totalRevenue - totalCogs;
    const netIncome = grossProfit - totalOpex;

    // ── Balance sheet ────────────────────────────────────────────────
    const assets = ofType('asset');
    const liabilities = ofType('liability');
    const equity = ofType('equity');
    const totalAssets = sum(assets);
    const totalLiabilities = sum(liabilities);
    const bookedEquity = sum(equity);
    const totalEquity = bookedEquity + netIncome; // current-period earnings roll into equity
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const difference = Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100;

    // ── Cash flow (cash-basis, from Treasury) ────────────────────────
    const cashInflows = txns.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + num(t.amount), 0);
    const cashOutflows = txns.filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + num(t.amount), 0);
    const netCashFlow = cashInflows - cashOutflows;
    const endingCash = banks.reduce((s: number, b: any) => s + num(b.balance), 0);
    const beginningCash = endingCash - netCashFlow;

    return ok({
      incomeStatement: {
        revenue, totalRevenue,
        cogs, totalCogs,
        grossProfit,
        operatingExpenses: opex, totalOperatingExpenses: totalOpex,
        netIncome,
      },
      balanceSheet: {
        assets, totalAssets,
        liabilities, totalLiabilities,
        equity, bookedEquity,
        currentEarnings: netIncome,
        totalEquity,
        totalLiabilitiesAndEquity,
        balanced: Math.abs(difference) < 0.01,
        difference,
      },
      cashFlow: {
        beginningCash,
        cashInflows,
        cashOutflows,
        netCashFlow,
        endingCash,
      },
    });
  },
);
