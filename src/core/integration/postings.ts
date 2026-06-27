import { prisma } from '@/src/core/db/client';

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
