import { prisma } from '@/src/core/db/client';
import { NotificationService } from '@/src/core/notifications/notification.service';

/**
 * Cross-module integration layer.
 *
 * These helpers let one module ripple into others (the "connected ERP" behaviour):
 *  - sales/procurement movements adjust Inventory stock
 *  - completed purchases/sales post to Treasury (cash) and Accounting (the GL)
 *
 * Every helper is best-effort: if the target module isn't set up for the tenant
 * (no bank account, no chart of accounts, etc.) it no-ops and returns null instead
 * of throwing, so the core action never fails because a downstream module is missing.
 */

type Db = { stockEntry: any; stockAdjustment: any; bankAccount: any; bankTransaction: any; chartOfAccount: any; journalEntry: any; journalLine: any };
const db = prisma as unknown as Db;

interface SoldItem { description: string; quantity: number | string; unit?: string | null }

/** Decrease inventory for items leaving on a sales shipment (negative stock adjustments). */
export async function decrementStockForSale(tenantId: number, userId: number, items: SoldItem[], reference: string): Promise<number> {
  let count = 0;
  for (const it of items) {
    const qty = Math.abs(Number(it.quantity) || 0);
    if (qty <= 0) continue;
    // Match the unit of existing stock for this description so the movement lands on the right line.
    let unit = it.unit ?? null;
    if (!unit) {
      const existing = await db.stockEntry.findFirst({ where: { tenantId, description: it.description }, select: { unit: true } });
      unit = existing?.unit ?? 'units';
    }
    await db.stockAdjustment.create({
      data: { tenantId, description: it.description, quantity: -qty, unit, reason: `Sales shipment — ${reference}`, createdBy: userId },
    });
    count++;
  }
  return count;
}

type MovementType = 'credit' | 'debit';

/** Record a cash movement on the tenant's primary active bank account (Treasury). */
export async function recordTreasuryMovement(
  tenantId: number,
  userId: number,
  opts: { type: MovementType; amount: number; description: string; reference?: string },
): Promise<boolean> {
  const amount = Number(opts.amount) || 0;
  if (amount <= 0) return false;
  const account = await db.bankAccount.findFirst({ where: { tenantId, isActive: true }, orderBy: { id: 'asc' } });
  if (!account) return false;

  await db.bankTransaction.create({
    data: {
      bankAccountId: account.id,
      tenantId,
      description: opts.description,
      amount,
      type: opts.type,
      reference: opts.reference ?? null,
      reconciled: false,
      createdBy: userId,
    },
  });
  await db.bankAccount.update({
    where: { id: account.id },
    data: { balance: { increment: opts.type === 'credit' ? amount : -amount } },
  });
  return true;
}

interface JournalLineInput { code: string; debit?: number; credit?: number; memo?: string }

const NORMAL_DEBIT = new Set(['asset', 'expense']);

/** Post a balanced double-entry journal to Accounting and update account balances. */
export async function recordJournalEntry(
  tenantId: number,
  userId: number,
  description: string,
  lines: JournalLineInput[],
): Promise<boolean> {
  const codes = Array.from(new Set(lines.map(l => l.code)));
  const accounts = await db.chartOfAccount.findMany({ where: { tenantId, code: { in: codes } } });
  const byCode = new Map<string, { id: number; type: string }>(accounts.map((a: any) => [a.code, { id: a.id, type: a.type }]));
  // If any account is missing, skip — accounting isn't set up to receive this posting.
  if (lines.some(l => !byCode.has(l.code))) return false;

  const count = await db.journalEntry.count({ where: { tenantId } });
  const entryNumber = 'JE-' + String(count + 1).padStart(5, '0');
  const entry = await db.journalEntry.create({
    data: { tenantId, entryNumber, description, status: 'posted', createdBy: userId },
  });

  for (const l of lines) {
    const acc = byCode.get(l.code)!;
    const debit = Number(l.debit) || 0;
    const credit = Number(l.credit) || 0;
    await db.journalLine.create({
      data: { journalEntryId: entry.id, tenantId, accountId: acc.id, description: l.memo ?? null, debit, credit },
    });
    // Move the account balance along its normal side.
    const delta = NORMAL_DEBIT.has(acc.type) ? debit - credit : credit - debit;
    if (delta !== 0) {
      await db.chartOfAccount.update({ where: { id: acc.id }, data: { balance: { increment: delta } } });
    }
  }
  return true;
}

/** Find a chart-of-accounts entry by code, creating it if missing. Returns its id. */
async function ensureAccount(tenantId: number, userId: number, code: string, name: string, type: string): Promise<number> {
  const p = prisma as any;
  const existing = await p.chartOfAccount.findFirst({ where: { tenantId, code } });
  if (existing) return existing.id;
  const created = await p.chartOfAccount.create({ data: { tenantId, code, name, type, balance: 0, createdBy: userId } });
  return created.id;
}

/**
 * Cost of goods sold: value the sold items at their latest stock unit cost and post
 * Dr Cost of Goods Sold / Cr Inventory, so margin and inventory value stay real.
 */
export async function recordCOGS(tenantId: number, userId: number, items: SoldItem[], reference: string): Promise<boolean> {
  const p = prisma as any;
  let cost = 0;
  for (const it of items) {
    const qty = Math.abs(Number(it.quantity) || 0);
    if (qty <= 0) continue;
    const entry = await p.stockEntry.findFirst({
      where: { tenantId, description: it.description, unitCost: { not: null } },
      orderBy: { receivedAt: 'desc' },
      select: { unitCost: true },
    });
    const unitCost = entry?.unitCost != null ? Number(entry.unitCost) : 0;
    cost += qty * unitCost;
  }
  if (cost <= 0) return false;
  await ensureAccount(tenantId, userId, '5100', 'Cost of Goods Sold', 'expense');
  await ensureAccount(tenantId, userId, '1200', 'Inventory', 'asset');
  return recordJournalEntry(tenantId, userId, `COGS ${reference}`, [
    { code: '5100', debit: cost, memo: `COGS ${reference}` },
    { code: '1200', credit: cost, memo: `Inventory reduction ${reference}` },
  ]);
}

/**
 * Post an issued AR invoice to the GL: Dr 1100 Accounts Receivable / Cr 4000 Revenue.
 * (COGS is posted separately via recordCOGS when the invoice is tied to shipped goods.)
 */
export async function postARInvoice(
  tenantId: number,
  userId: number,
  opts: { invoiceNumber: string; total: number },
): Promise<boolean> {
  const total = Number(opts.total) || 0;
  if (total <= 0) return false;
  await ensureAccount(tenantId, userId, '1100', 'Accounts Receivable', 'asset');
  await ensureAccount(tenantId, userId, '4000', 'Revenue', 'revenue');
  return recordJournalEntry(tenantId, userId, `AR invoice ${opts.invoiceNumber}`, [
    { code: '1100', debit: total, memo: `Receivable ${opts.invoiceNumber}` },
    { code: '4000', credit: total, memo: `Revenue ${opts.invoiceNumber}` },
  ]);
}

/**
 * Post an approved AP invoice to the GL: Dr expense (5000, or 1200 Inventory for
 * stockable goods) / Cr 2000 Accounts Payable.
 */
export async function postAPInvoice(
  tenantId: number,
  userId: number,
  opts: { invoiceNumber: string; total: number; expenseCode?: string },
): Promise<boolean> {
  const total = Number(opts.total) || 0;
  if (total <= 0) return false;
  const expenseCode = opts.expenseCode ?? '5000';
  const isInventory = expenseCode === '1200';
  await ensureAccount(tenantId, userId, expenseCode, isInventory ? 'Inventory' : 'Operating Expenses', isInventory ? 'asset' : 'expense');
  await ensureAccount(tenantId, userId, '2000', 'Accounts Payable', 'liability');
  return recordJournalEntry(tenantId, userId, `AP invoice ${opts.invoiceNumber}`, [
    { code: expenseCode, debit: total, memo: `Expense ${opts.invoiceNumber}` },
    { code: '2000', credit: total, memo: `Payable ${opts.invoiceNumber}` },
  ]);
}

/**
 * Settle an invoice: move cash in Treasury and post the GL clearing entry.
 *  - AR: cash in  → Dr 1000 Cash / Cr 1100 Accounts Receivable
 *  - AP: cash out → Dr 2000 Accounts Payable / Cr 1000 Cash
 */
export async function postInvoicePayment(
  tenantId: number,
  userId: number,
  opts: { kind: 'AR' | 'AP'; amount: number; reference: string },
): Promise<boolean> {
  const amount = Number(opts.amount) || 0;
  if (amount <= 0) return false;
  await ensureAccount(tenantId, userId, '1000', 'Cash', 'asset');

  if (opts.kind === 'AR') {
    await ensureAccount(tenantId, userId, '1100', 'Accounts Receivable', 'asset');
    await recordTreasuryMovement(tenantId, userId, { type: 'credit', amount, description: `Customer payment — ${opts.reference}`, reference: opts.reference });
    return recordJournalEntry(tenantId, userId, `AR payment ${opts.reference}`, [
      { code: '1000', debit: amount, memo: `Cash received ${opts.reference}` },
      { code: '1100', credit: amount, memo: `Clear receivable ${opts.reference}` },
    ]);
  }

  await ensureAccount(tenantId, userId, '2000', 'Accounts Payable', 'liability');
  await recordTreasuryMovement(tenantId, userId, { type: 'debit', amount, description: `Vendor payment — ${opts.reference}`, reference: opts.reference });
  return recordJournalEntry(tenantId, userId, `AP payment ${opts.reference}`, [
    { code: '2000', debit: amount, memo: `Clear payable ${opts.reference}` },
    { code: '1000', credit: amount, memo: `Cash paid ${opts.reference}` },
  ]);
}

/** Roll spend into a live "actual" line under the tenant's active budget plan. */
export async function addBudgetActual(tenantId: number, amount: number, category: string): Promise<boolean> {
  const p = prisma as any;
  const amt = Number(amount) || 0;
  if (amt <= 0) return false;
  const plan = await p.budgetPlan.findFirst({ where: { tenantId, status: 'active' }, orderBy: { fiscalYear: 'desc' } });
  if (!plan) return false;
  let line = await p.budgetPlanItem.findFirst({ where: { budgetId: plan.id, category } });
  if (!line) {
    line = await p.budgetPlanItem.create({
      data: { budgetId: plan.id, tenantId, category, description: 'Auto-tracked actuals', plannedAmount: 0, actualAmount: 0 },
    });
  }
  await p.budgetPlanItem.update({ where: { id: line.id }, data: { actualAmount: { increment: amt } } });
  return true;
}

const LOW_STOCK_THRESHOLD = 5;

/** After stock leaves, alert stock watchers about any item at/under the low-stock threshold. */
export async function notifyLowStock(tenantId: number, descriptions: string[]): Promise<void> {
  const p = prisma as any;
  const notifier = new NotificationService(tenantId);
  for (const description of Array.from(new Set(descriptions))) {
    const [e, a] = await Promise.all([
      p.stockEntry.aggregate({ where: { tenantId, description, conforming: true }, _sum: { quantity: true } }),
      p.stockAdjustment.aggregate({ where: { tenantId, description }, _sum: { quantity: true } }),
    ]);
    const level = Number(e._sum.quantity ?? 0) + Number(a._sum.quantity ?? 0);
    if (level <= LOW_STOCK_THRESHOLD) {
      await notifier.notifyUsersWithPermission(
        'inventory.stock_entry.read',
        'low_stock',
        'Low stock alert',
        `${description} is running low (${level} left)`,
        'inventory',
        undefined,
        'inventory',
      );
    }
  }
}
