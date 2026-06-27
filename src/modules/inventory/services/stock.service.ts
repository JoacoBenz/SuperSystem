import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { CreateStockEntryInput, StockEntry } from '../types';

export class StockService {
  constructor(
    private db: TenantDB,
    private userId: number,
    private audit: AuditService,
  ) {}

  /**
   * Creates stock entries for each item in a reception.
   * Called automatically after a reception is recorded in procurement.
   */
  async createEntriesFromReception(
    receptionId: number,
    items: CreateStockEntryInput[],
  ): Promise<StockEntry[]> {
    const created: StockEntry[] = [];

    for (const item of items) {
      const entry = await this.db.stockEntry.create({
        data: {
          receptionId,
          purchaseRequestItemId: item.purchaseRequestItemId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost ?? null,
          vendorId: item.vendorId ?? null,
          conforming: item.conforming,
          notes: item.notes ?? null,
          createdBy: this.userId,
        } as any,
      });
      created.push(entry as unknown as StockEntry);
    }

    await this.audit.log({
      action: 'create',
      resource: 'stock_entry',
      resourceId: receptionId,
      moduleId: 'inventory',
      newData: { receptionId, itemCount: created.length },
    });

    return created;
  }

  async listByReception(receptionId: number): Promise<StockEntry[]> {
    const rows = await this.db.stockEntry.findMany({
      where: { receptionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows as unknown as StockEntry[];
  }
}
