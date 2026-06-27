import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockService } from '../services/stock.service';
import type { CreateStockEntryInput } from '../types';

// ── Mock helpers ─────────────────────────────────────────────────────────────

function makeEntry(overrides = {}) {
  return {
    id: 1,
    tenantId: 10,
    receptionId: 5,
    purchaseRequestItemId: 20,
    description: 'Ballpoint pens (box)',
    quantity: 5,
    unit: 'box',
    unitCost: 12.5,
    vendorId: 3,
    conforming: true,
    notes: null,
    receivedAt: new Date(),
    createdBy: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeDb(entries: unknown[] = []) {
  return {
    stockEntry: {
      create: vi.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: Math.floor(Math.random() * 1000), ...data, createdAt: new Date(), receivedAt: new Date() }),
      ),
      findMany: vi.fn().mockResolvedValue(entries),
    },
  };
}

function makeAudit() {
  return { log: vi.fn().mockResolvedValue(undefined) };
}

const USER_ID = 1;

// ── createEntriesFromReception ────────────────────────────────────────────────

describe('StockService.createEntriesFromReception', () => {
  let db: ReturnType<typeof makeDb>;
  let audit: ReturnType<typeof makeAudit>;
  let service: StockService;

  beforeEach(() => {
    db = makeDb();
    audit = makeAudit();
    service = new StockService(db as any, USER_ID, audit as any);
  });

  const baseItem: CreateStockEntryInput = {
    receptionId: 5,
    purchaseRequestItemId: 20,
    description: 'Ballpoint pens (box)',
    quantity: 5,
    unit: 'box',
    unitCost: 12.5,
    vendorId: 3,
    conforming: true,
    notes: null,
  };

  it('creates one stock entry per reception item', async () => {
    const items: CreateStockEntryInput[] = [
      baseItem,
      { ...baseItem, purchaseRequestItemId: 21, description: 'Notebooks', quantity: 10, unit: 'units' },
    ];

    const result = await service.createEntriesFromReception(5, items);

    expect(db.stockEntry.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('passes correct fields to db.stockEntry.create', async () => {
    await service.createEntriesFromReception(5, [baseItem]);

    expect(db.stockEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        receptionId: 5,
        purchaseRequestItemId: 20,
        description: 'Ballpoint pens (box)',
        quantity: 5,
        unit: 'box',
        unitCost: 12.5,
        vendorId: 3,
        conforming: true,
        notes: null,
        createdBy: USER_ID,
      }),
    });
  });

  it('defaults optional fields to null when omitted', async () => {
    const minimalItem: CreateStockEntryInput = {
      receptionId: 5,
      purchaseRequestItemId: 20,
      description: 'Item',
      quantity: 1,
      unit: 'units',
      conforming: true,
    };

    await service.createEntriesFromReception(5, [minimalItem]);

    expect(db.stockEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitCost: null,
        vendorId: null,
        notes: null,
      }),
    });
  });

  it('logs an audit entry after creating stock entries', async () => {
    await service.createEntriesFromReception(5, [baseItem]);

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        resource: 'stock_entry',
        resourceId: 5,
        moduleId: 'inventory',
        newData: { receptionId: 5, itemCount: 1 },
      }),
    );
  });

  it('returns empty array and still logs when items list is empty', async () => {
    const result = await service.createEntriesFromReception(5, []);
    expect(result).toHaveLength(0);
    expect(db.stockEntry.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ newData: { receptionId: 5, itemCount: 0 } }),
    );
  });

  it('handles non-conforming items', async () => {
    await service.createEntriesFromReception(5, [
      { ...baseItem, conforming: false, notes: 'Box was damaged on arrival' },
    ]);

    expect(db.stockEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conforming: false,
        notes: 'Box was damaged on arrival',
      }),
    });
  });

  it('returns the created entries with their db-assigned ids', async () => {
    const result = await service.createEntriesFromReception(5, [baseItem, { ...baseItem, purchaseRequestItemId: 21 }]);
    expect(result.every(e => typeof e.id === 'number')).toBe(true);
  });
});

// ── listByReception ───────────────────────────────────────────────────────────

describe('StockService.listByReception', () => {
  it('queries stockEntry.findMany with the correct receptionId', async () => {
    const entries = [makeEntry(), makeEntry({ id: 2, purchaseRequestItemId: 21 })];
    const db = makeDb(entries);
    const audit = makeAudit();
    const service = new StockService(db as any, USER_ID, audit as any);

    const result = await service.listByReception(5);

    expect(db.stockEntry.findMany).toHaveBeenCalledWith({
      where: { receptionId: 5 },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no entries exist for the reception', async () => {
    const db = makeDb([]);
    const service = new StockService(db as any, USER_ID, makeAudit() as any);
    const result = await service.listByReception(99);
    expect(result).toHaveLength(0);
  });
});

// ── Procurement-inventory integration: createEntriesFromReception mapping ─────

describe('Procurement-Inventory integration mapping', () => {
  it('maps reception item fields correctly from a procurement reception', async () => {
    const db = makeDb();
    const audit = makeAudit();
    const service = new StockService(db as any, USER_ID, audit as any);

    // Simulate what the reception route does: map reception items → stock inputs
    const receptionItems = [
      { purchaseRequestItemId: 10, quantityReceived: 3, conforming: true, notes: null },
      { purchaseRequestItemId: 11, quantityReceived: 2, conforming: false, notes: 'Cracked packaging' },
    ];
    const prItemMap = new Map([
      [10, { id: 10, description: 'USB-C cables', unit: 'units', estimatedPrice: 9.99 }],
      [11, { id: 11, description: 'Surge protectors', unit: 'units', estimatedPrice: 24.99 }],
    ]);

    const stockInputs: CreateStockEntryInput[] = receptionItems.map(item => {
      const prItem = prItemMap.get(item.purchaseRequestItemId) as any;
      return {
        receptionId: 7,
        purchaseRequestItemId: item.purchaseRequestItemId,
        description: prItem.description,
        quantity: Number(item.quantityReceived),
        unit: prItem.unit,
        unitCost: prItem.estimatedPrice ? Number(prItem.estimatedPrice) : null,
        vendorId: 4,
        conforming: item.conforming,
        notes: item.notes,
      };
    });

    await service.createEntriesFromReception(7, stockInputs);

    const calls = (db.stockEntry.create as any).mock.calls;
    expect(calls[0][0].data).toMatchObject({
      description: 'USB-C cables',
      quantity: 3,
      unit: 'units',
      unitCost: 9.99,
      conforming: true,
    });
    expect(calls[1][0].data).toMatchObject({
      description: 'Surge protectors',
      quantity: 2,
      conforming: false,
      notes: 'Cracked packaging',
    });
  });

  it('falls back to "Unknown item" description when PR item is missing from map', async () => {
    const db = makeDb();
    const service = new StockService(db as any, USER_ID, makeAudit() as any);

    // Simulate a missing prItem (e.g. data inconsistency)
    const prItemMap = new Map<number, any>();
    const receptionItem = { purchaseRequestItemId: 99, quantityReceived: 1, conforming: true, notes: null };
    const prItem = prItemMap.get(receptionItem.purchaseRequestItemId);

    const input: CreateStockEntryInput = {
      receptionId: 8,
      purchaseRequestItemId: receptionItem.purchaseRequestItemId,
      description: prItem?.description ?? 'Unknown item',
      quantity: Number(receptionItem.quantityReceived),
      unit: prItem?.unit ?? 'units',
      unitCost: null,
      vendorId: null,
      conforming: receptionItem.conforming,
      notes: null,
    };

    await service.createEntriesFromReception(8, [input]);

    expect(db.stockEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: 'Unknown item', unit: 'units' }),
    });
  });
});
