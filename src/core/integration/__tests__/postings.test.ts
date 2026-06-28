import { describe, it, expect, vi, beforeEach } from 'vitest';

// The posting layer binds to the global prisma singleton at import time
// (`const db = prisma as unknown as Db`), so we mock that module. Because `db`
// holds the same object reference, mutating mockPrisma's methods per-test is visible.
const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: {} as any }));
vi.mock('@/src/core/db/client', () => ({ prisma: mockPrisma }));

import {
  recordTreasuryMovement,
  recordJournalEntry,
  recordCOGS,
  addBudgetActual,
  decrementStockForSale,
  notifyLowStock,
  postARInvoice,
  postAPInvoice,
  postInvoicePayment,
} from '../postings';

const T = 1;
const U = 2;

beforeEach(() => {
  for (const k of Object.keys(mockPrisma)) delete mockPrisma[k];
});

describe('recordTreasuryMovement', () => {
  it('credit creates a transaction and increments the balance', async () => {
    mockPrisma.bankAccount = { findFirst: vi.fn().mockResolvedValue({ id: 9, balance: 100 }), update: vi.fn().mockResolvedValue({}) };
    mockPrisma.bankTransaction = { create: vi.fn().mockResolvedValue({}) };

    const result = await recordTreasuryMovement(T, U, { type: 'credit', amount: 50, description: 'x' });

    expect(result).toBe(true);
    expect(mockPrisma.bankTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bankAccountId: 9, amount: 50, type: 'credit' }) }),
    );
    expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balance: { increment: 50 } }) }),
    );
  });

  it('debit decrements the balance', async () => {
    mockPrisma.bankAccount = { findFirst: vi.fn().mockResolvedValue({ id: 9, balance: 100 }), update: vi.fn().mockResolvedValue({}) };
    mockPrisma.bankTransaction = { create: vi.fn().mockResolvedValue({}) };

    await recordTreasuryMovement(T, U, { type: 'debit', amount: 30, description: 'x' });

    expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balance: { increment: -30 } }) }),
    );
  });

  it('no-ops when there is no active bank account', async () => {
    mockPrisma.bankAccount = { findFirst: vi.fn().mockResolvedValue(null) };
    mockPrisma.bankTransaction = { create: vi.fn() };
    expect(await recordTreasuryMovement(T, U, { type: 'credit', amount: 50, description: 'x' })).toBe(false);
    expect(mockPrisma.bankTransaction.create).not.toHaveBeenCalled();
  });

  it('no-ops for a non-positive amount (before any query)', async () => {
    mockPrisma.bankAccount = { findFirst: vi.fn() };
    expect(await recordTreasuryMovement(T, U, { type: 'credit', amount: 0, description: 'x' })).toBe(false);
    expect(mockPrisma.bankAccount.findFirst).not.toHaveBeenCalled();
  });
});

describe('recordJournalEntry', () => {
  const chart = (accs: any[]) => ({
    findMany: vi.fn().mockResolvedValue(accs),
    update: vi.fn().mockResolvedValue({}),
    findFirst: vi.fn(),
    create: vi.fn(),
  });

  it('posts balanced lines and moves balances by normal side', async () => {
    mockPrisma.chartOfAccount = chart([
      { id: 1, code: '1100', type: 'asset' },
      { id: 2, code: '4000', type: 'revenue' },
    ]);
    mockPrisma.journalEntry = { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 7 }) };
    mockPrisma.journalLine = { create: vi.fn().mockResolvedValue({}) };

    const result = await recordJournalEntry(T, U, 'Sale', [
      { code: '1100', debit: 100 },
      { code: '4000', credit: 100 },
    ]);

    expect(result).toBe(true);
    expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entryNumber: 'JE-00001', status: 'posted' }) }),
    );
    expect(mockPrisma.journalLine.create).toHaveBeenCalledTimes(2);
    // asset (1100): normal-debit → +100
    expect(mockPrisma.chartOfAccount.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { balance: { increment: 100 } } });
    // revenue (4000): normal-credit → +100
    expect(mockPrisma.chartOfAccount.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { balance: { increment: 100 } } });
  });

  it('skips when any account code is missing', async () => {
    mockPrisma.chartOfAccount = chart([{ id: 1, code: '1100', type: 'asset' }]); // 4000 absent
    mockPrisma.journalEntry = { count: vi.fn(), create: vi.fn() };
    mockPrisma.journalLine = { create: vi.fn() };

    const result = await recordJournalEntry(T, U, 'Sale', [
      { code: '1100', debit: 100 },
      { code: '4000', credit: 100 },
    ]);

    expect(result).toBe(false);
    expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
  });
});

describe('recordCOGS', () => {
  it('values items at the latest stock unit cost and posts Dr COGS / Cr Inventory', async () => {
    mockPrisma.stockEntry = { findFirst: vi.fn().mockResolvedValue({ unitCost: 5 }) };
    mockPrisma.chartOfAccount = {
      findFirst: vi.fn().mockResolvedValue({ id: 1 }), // ensureAccount: already exists
      findMany: vi.fn().mockResolvedValue([
        { id: 51, code: '5100', type: 'expense' },
        { id: 12, code: '1200', type: 'asset' },
      ]),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn(),
    };
    mockPrisma.journalEntry = { count: vi.fn().mockResolvedValue(5), create: vi.fn().mockResolvedValue({ id: 8 }) };
    mockPrisma.journalLine = { create: vi.fn().mockResolvedValue({}) };

    const result = await recordCOGS(T, U, [{ description: 'Widget', quantity: 2 }], 'SO-1'); // cost 2×5=10
    expect(result).toBe(true);
    expect(mockPrisma.journalLine.create).toHaveBeenCalledTimes(2);
  });

  it('no-ops when no unit cost is known for the items', async () => {
    mockPrisma.stockEntry = { findFirst: vi.fn().mockResolvedValue(null) };
    mockPrisma.chartOfAccount = { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() };
    mockPrisma.journalEntry = { count: vi.fn(), create: vi.fn() };
    mockPrisma.journalLine = { create: vi.fn() };

    expect(await recordCOGS(T, U, [{ description: 'X', quantity: 2 }], 'SO-1')).toBe(false);
    expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
  });
});

describe('addBudgetActual', () => {
  it('creates the line if missing and increments the actual', async () => {
    mockPrisma.budgetPlan = { findFirst: vi.fn().mockResolvedValue({ id: 3 }) };
    mockPrisma.budgetPlanItem = {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 9 }),
      update: vi.fn().mockResolvedValue({}),
    };

    expect(await addBudgetActual(T, 100, 'Procurement Spend')).toBe(true);
    expect(mockPrisma.budgetPlanItem.create).toHaveBeenCalled();
    expect(mockPrisma.budgetPlanItem.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { actualAmount: { increment: 100 } } });
  });

  it('no-ops when there is no active budget plan', async () => {
    mockPrisma.budgetPlan = { findFirst: vi.fn().mockResolvedValue(null) };
    mockPrisma.budgetPlanItem = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() };
    expect(await addBudgetActual(T, 100, 'X')).toBe(false);
  });
});

describe('decrementStockForSale', () => {
  it('writes a negative adjustment using existing stock unit', async () => {
    mockPrisma.stockEntry = { findFirst: vi.fn().mockResolvedValue({ unit: 'box' }) };
    mockPrisma.stockAdjustment = { create: vi.fn().mockResolvedValue({}) };

    const n = await decrementStockForSale(T, U, [{ description: 'Pens', quantity: 3 }], 'SO-9');
    expect(n).toBe(1);
    expect(mockPrisma.stockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Pens', quantity: -3, unit: 'box' }) }),
    );
  });

  it('skips zero-quantity items', async () => {
    mockPrisma.stockEntry = { findFirst: vi.fn() };
    mockPrisma.stockAdjustment = { create: vi.fn() };
    const n = await decrementStockForSale(T, U, [{ description: 'X', quantity: 0 }], 'SO-9');
    expect(n).toBe(0);
    expect(mockPrisma.stockAdjustment.create).not.toHaveBeenCalled();
  });
});

describe('notifyLowStock', () => {
  it('notifies when net stock is at or below the threshold', async () => {
    mockPrisma.stockEntry = { aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 10 } }) };
    mockPrisma.stockAdjustment = { aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: -8 } }) }; // level 2
    mockPrisma.user = { findMany: vi.fn().mockResolvedValue([{ id: 1 }]) };
    mockPrisma.notification = { createMany: vi.fn().mockResolvedValue({}) };

    await notifyLowStock(T, ['Pens']);
    expect(mockPrisma.notification.createMany).toHaveBeenCalled();
  });

  it('does not notify when above the threshold', async () => {
    mockPrisma.stockEntry = { aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 100 } }) };
    mockPrisma.stockAdjustment = { aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 0 } }) };
    mockPrisma.user = { findMany: vi.fn() };
    mockPrisma.notification = { createMany: vi.fn() };

    await notifyLowStock(T, ['Pens']);
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });
});

// Chart mock that satisfies both ensureAccount (findFirst → exists) and
// recordJournalEntry (findMany → the given accounts).
const fullChart = (accs: any[]) => ({
  findFirst: vi.fn().mockResolvedValue({ id: 1 }),
  findMany: vi.fn().mockResolvedValue(accs),
  update: vi.fn().mockResolvedValue({}),
  create: vi.fn().mockResolvedValue({ id: 99 }),
});
const journalMocks = () => {
  mockPrisma.journalEntry = { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 1 }) };
  mockPrisma.journalLine = { create: vi.fn().mockResolvedValue({}) };
};

describe('postARInvoice', () => {
  it('posts Dr 1100 Receivable / Cr 4000 Revenue, both up by total', async () => {
    mockPrisma.chartOfAccount = fullChart([
      { id: 11, code: '1100', type: 'asset' },
      { id: 40, code: '4000', type: 'revenue' },
    ]);
    journalMocks();
    expect(await postARInvoice(T, U, { invoiceNumber: 'INV-1', total: 100 })).toBe(true);
    expect(mockPrisma.journalLine.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.chartOfAccount.update).toHaveBeenCalledWith({ where: { id: 11 }, data: { balance: { increment: 100 } } });
    expect(mockPrisma.chartOfAccount.update).toHaveBeenCalledWith({ where: { id: 40 }, data: { balance: { increment: 100 } } });
  });

  it('no-ops on a non-positive total', async () => {
    expect(await postARInvoice(T, U, { invoiceNumber: 'X', total: 0 })).toBe(false);
  });
});

describe('postAPInvoice', () => {
  it('posts Dr 5000 Expense / Cr 2000 Payable, both up by total', async () => {
    mockPrisma.chartOfAccount = fullChart([
      { id: 50, code: '5000', type: 'expense' },
      { id: 20, code: '2000', type: 'liability' },
    ]);
    journalMocks();
    expect(await postAPInvoice(T, U, { invoiceNumber: 'BILL-1', total: 200 })).toBe(true);
    expect(mockPrisma.chartOfAccount.update).toHaveBeenCalledWith({ where: { id: 50 }, data: { balance: { increment: 200 } } });
    expect(mockPrisma.chartOfAccount.update).toHaveBeenCalledWith({ where: { id: 20 }, data: { balance: { increment: 200 } } });
  });

  it('no-ops on a non-positive total', async () => {
    expect(await postAPInvoice(T, U, { invoiceNumber: 'X', total: 0 })).toBe(false);
  });
});

describe('postInvoicePayment', () => {
  it('AR settlement moves cash IN (treasury credit) and clears the receivable', async () => {
    mockPrisma.chartOfAccount = fullChart([
      { id: 10, code: '1000', type: 'asset' },
      { id: 11, code: '1100', type: 'asset' },
    ]);
    mockPrisma.bankAccount = { findFirst: vi.fn().mockResolvedValue({ id: 5, balance: 0 }), update: vi.fn().mockResolvedValue({}) };
    mockPrisma.bankTransaction = { create: vi.fn().mockResolvedValue({}) };
    journalMocks();
    expect(await postInvoicePayment(T, U, { kind: 'AR', amount: 50, reference: 'INV-1' })).toBe(true);
    expect(mockPrisma.bankTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'credit', amount: 50 }) }));
    expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ balance: { increment: 50 } }) }));
  });

  it('AP settlement moves cash OUT (treasury debit) and clears the payable', async () => {
    mockPrisma.chartOfAccount = fullChart([
      { id: 10, code: '1000', type: 'asset' },
      { id: 20, code: '2000', type: 'liability' },
    ]);
    mockPrisma.bankAccount = { findFirst: vi.fn().mockResolvedValue({ id: 5, balance: 0 }), update: vi.fn().mockResolvedValue({}) };
    mockPrisma.bankTransaction = { create: vi.fn().mockResolvedValue({}) };
    journalMocks();
    expect(await postInvoicePayment(T, U, { kind: 'AP', amount: 70, reference: 'BILL-1' })).toBe(true);
    expect(mockPrisma.bankTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'debit', amount: 70 }) }));
    expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ balance: { increment: -70 } }) }));
  });

  it('no-ops on a non-positive amount', async () => {
    expect(await postInvoicePayment(T, U, { kind: 'AR', amount: 0, reference: 'X' })).toBe(false);
  });
});
