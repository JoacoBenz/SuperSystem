import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { StockMovementInput } from '../validators/stock-movement.schema';
import { ApiError } from '@/src/core/api/errors';

function toNumber(v: unknown): number {
  return v == null ? 0 : Number(v);
}

function serializeLevel(sl: any) {
  return {
    ...sl,
    quantityOnHand: toNumber(sl.quantityOnHand),
    quantityReserved: toNumber(sl.quantityReserved),
    quantityAvailable: toNumber(sl.quantityAvailable),
    ...(sl.product?.minStock !== undefined ? { product: { ...sl.product, minStock: toNumber(sl.product.minStock) } } : {}),
  };
}

function serializeMovement(m: any) {
  return { ...m, quantity: toNumber(m.quantity) };
}

export class StockService {
  constructor(
    private db: TenantDB,
    private tenantId: number,
    private userId: number,
    private audit: AuditService,
  ) {}

  async listLevels(params: { page?: number; pageSize?: number; warehouseId?: number; productId?: number; lowStockOnly?: boolean }) {
    const { page = 1, pageSize = 20, warehouseId, productId, lowStockOnly } = params;
    const where: Record<string, unknown> = {};

    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const [data, total] = await Promise.all([
      this.db.stockLevel.findMany({
        where: where as any,
        include: {
          product: { select: { id: true, sku: true, name: true, unitOfMeasure: true, minStock: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.stockLevel.count({ where: where as any }),
    ]);

    const serialized = data.map(serializeLevel);
    const filtered = lowStockOnly
      ? serialized.filter((sl: any) => sl.product.minStock && sl.quantityAvailable < sl.product.minStock)
      : serialized;

    return {
      data: filtered,
      total: lowStockOnly ? filtered.length : total,
      page,
      totalPages: Math.ceil((lowStockOnly ? filtered.length : total) / pageSize),
    };
  }

  async listMovements(params: { page?: number; pageSize?: number; productId?: number; warehouseId?: number; movementType?: string }) {
    const { page = 1, pageSize = 20, productId, warehouseId, movementType } = params;
    const where: Record<string, unknown> = {};

    if (productId) where.productId = productId;
    if (movementType) where.movementType = movementType;
    if (warehouseId) {
      where.OR = [
        { warehouseFromId: warehouseId },
        { warehouseToId: warehouseId },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.stockMovement.findMany({
        where: where as any,
        include: {
          product: { select: { id: true, sku: true, name: true, unitOfMeasure: true } },
          warehouseFrom: { select: { id: true, name: true, code: true } },
          warehouseTo: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.stockMovement.count({ where: where as any }),
    ]);

    return { data: data.map(serializeMovement), total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async createMovement(input: StockMovementInput) {
    // Validate product exists
    const product = await this.db.product.findUnique({ where: { id: input.productId } });
    if (!product || product.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Product not found', 404);
    }

    // Validate warehouses
    if (input.warehouseFromId) {
      const wh = await this.db.warehouse.findUnique({ where: { id: input.warehouseFromId } });
      if (!wh || wh.deletedAt) throw new ApiError('NOT_FOUND', 'Source warehouse not found', 404);
    }
    if (input.warehouseToId) {
      const wh = await this.db.warehouse.findUnique({ where: { id: input.warehouseToId } });
      if (!wh || wh.deletedAt) throw new ApiError('NOT_FOUND', 'Destination warehouse not found', 404);
    }

    // Validate movement type requirements
    switch (input.movementType) {
      case 'receipt':
        if (!input.warehouseToId) throw new ApiError('VALIDATION', 'Receipt requires a destination warehouse', 400);
        break;
      case 'issue':
        if (!input.warehouseFromId) throw new ApiError('VALIDATION', 'Issue requires a source warehouse', 400);
        break;
      case 'transfer':
        if (!input.warehouseFromId || !input.warehouseToId) throw new ApiError('VALIDATION', 'Transfer requires both source and destination warehouse', 400);
        break;
      case 'adjustment':
        if (!input.warehouseToId && !input.warehouseFromId) throw new ApiError('VALIDATION', 'Adjustment requires a warehouse', 400);
        break;
    }

    // Check sufficient stock for issue/transfer
    if (input.warehouseFromId && (input.movementType === 'issue' || input.movementType === 'transfer')) {
      const level = await this.db.stockLevel.findFirst({
        where: { productId: input.productId, warehouseId: input.warehouseFromId } as any,
      });
      const available = level ? Number(level.quantityAvailable) : 0;
      if (available < input.quantity) {
        throw new ApiError('VALIDATION', `Insufficient stock. Available: ${available}, Requested: ${input.quantity}`, 400);
      }
    }

    // Create movement
    const movement = await this.db.stockMovement.create({
      data: {
        ...input,
        createdBy: this.userId,
      } as any,
    });

    // Update stock levels
    if (input.warehouseFromId) {
      await this.adjustStockLevel(input.productId, input.warehouseFromId, -input.quantity);
    }
    if (input.warehouseToId) {
      await this.adjustStockLevel(input.productId, input.warehouseToId, input.quantity);
    }

    await this.audit.log({
      action: 'create', resource: 'stock_movement', resourceId: movement.id, moduleId: 'inventory',
      newData: { movementType: input.movementType, productId: input.productId, quantity: input.quantity },
    });

    return movement;
  }

  private async adjustStockLevel(productId: number, warehouseId: number, quantityDelta: number) {
    const existing = await this.db.stockLevel.findFirst({
      where: { productId, warehouseId } as any,
    });

    if (existing) {
      const newOnHand = Number(existing.quantityOnHand) + quantityDelta;
      const newAvailable = Number(existing.quantityAvailable) + quantityDelta;
      await this.db.stockLevel.update({
        where: { id: existing.id },
        data: {
          quantityOnHand: Math.max(0, newOnHand),
          quantityAvailable: Math.max(0, newAvailable),
        },
      });
    } else if (quantityDelta > 0) {
      await this.db.stockLevel.create({
        data: {
          tenantId: this.tenantId,
          productId,
          warehouseId,
          quantityOnHand: quantityDelta,
          quantityReserved: 0,
          quantityAvailable: quantityDelta,
        } as any,
      });
    }
  }
}
