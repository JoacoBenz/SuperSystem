// Pure financial-statement aggregation from GL accounts + Treasury.
// Extracted from the API route so it can be unit-tested without a database.

export interface AccountRow { code: string; name: string; type: string; balance: number | string | null }
export interface BankRow { balance: number | string | null }
export interface TxnRow { amount: number | string | null; type: string }

const COGS_RE = /cost of goods/i;
const isCogs = (a: { code?: string; name?: string }) =>
  (a.code ?? '').startsWith('51') || COGS_RE.test(a.name ?? '');

export function computeStatements(accounts: AccountRow[], banks: BankRow[], txns: TxnRow[]) {
  const num = (v: unknown) => Number(v ?? 0);
  const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + x.amount, 0);
  const line = (a: AccountRow) => ({ code: a.code, name: a.name, amount: num(a.balance) });
  const ofType = (t: string) => accounts.filter(a => a.type === t).map(line);

  // ── Income statement ───────────────────────────────────────────────
  const revenue = ofType('revenue');
  const expenseAccts = accounts.filter(a => a.type === 'expense');
  const cogs = expenseAccts.filter(isCogs).map(line);
  const opex = expenseAccts.filter(a => !isCogs(a)).map(line);

  const totalRevenue = sum(revenue);
  const totalCogs = sum(cogs);
  const totalOpex = sum(opex);
  const grossProfit = totalRevenue - totalCogs;
  const netIncome = grossProfit - totalOpex;

  // ── Balance sheet ──────────────────────────────────────────────────
  const assets = ofType('asset');
  const liabilities = ofType('liability');
  const equity = ofType('equity');
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const bookedEquity = sum(equity);
  const totalEquity = bookedEquity + netIncome; // current-period earnings roll into equity
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100;

  // ── Cash flow (cash-basis, from Treasury) ──────────────────────────
  const cashInflows = txns.filter(t => t.type === 'credit').reduce((s, t) => s + num(t.amount), 0);
  const cashOutflows = txns.filter(t => t.type === 'debit').reduce((s, t) => s + num(t.amount), 0);
  const netCashFlow = cashInflows - cashOutflows;
  const endingCash = banks.reduce((s, b) => s + num(b.balance), 0);
  const beginningCash = endingCash - netCashFlow;

  return {
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
    cashFlow: { beginningCash, cashInflows, cashOutflows, netCashFlow, endingCash },
  };
}
