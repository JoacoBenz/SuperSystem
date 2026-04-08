import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { ProductInput } from '../validators/product.schema';
import { ApiError } from '@/src/core/api/errors';

function toNum(v: unknown): number | null {
  return v == null ? null : Number(v);
}

function serializeProduct(p: any) {
  return {
    ...p,
    minStock: toNum(p.minStock),
    maxStock: toNum(p.maxStock),
    costPrice: toNum(p.costPrice),
    salePrice: toNum(p.salePrice),
  };
}

export class ProductService {
  constructor(
    private db: TenantDB,
    private userId: number,
    private audit: AuditService,
  ) {}

  async list(params: { page?: number; pageSize?: number; search?: string; categoryId?: number; active?: boolean }) {
    const { page = 1, pageSize = 20, search, categoryId, active } = params;
    const where: Record<string, unknown> = { deletedAt: null };

    if (active !== undefined) where.active = active;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.product.findMany({
        where: where as any,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.product.count({ where: where as any }),
    ]);

    return { data: data.map(serializeProduct), total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: number) {
    const product = await this.db.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockLevels: { include: { warehouse: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!product || product.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Product not found', 404);
    }
    return product;
  }

  async create(input: ProductInput) {
    let product;
    try {
      product = await this.db.product.create({
        data: {
          ...input,
          costPrice: input.costPrice ?? null,
          salePrice: input.salePrice ?? null,
          minStock: input.minStock ?? null,
          maxStock: input.maxStock ?? null,
          createdBy: this.userId,
          updatedBy: this.userId,
        } as any,
      });
    } catch (err: any) {
      if (err.code === 'P2002') throw new ApiError('VALIDATION', 'A product with this SKU already exists', 409);
      throw err;
    }

    await this.audit.log({
      action: 'create', resource: 'product', resourceId: product.id, moduleId: 'inventory',
      newData: { sku: product.sku, name: product.name },
    });

    return product;
  }

  async update(id: number, input: Partial<ProductInput>) {
    const existing = await this.getById(id);

    const product = await this.db.product.update({
      where: { id },
      data: { ...input, updatedBy: this.userId, version: { increment: 1 } } as any,
    });

    await this.audit.log({
      action: 'update', resource: 'product', resourceId: id, moduleId: 'inventory',
      previousData: { name: existing.name },
      newData: { name: product.name },
    });

    return product;
  }

  async softDelete(id: number) {
    await this.getById(id);
    await this.db.product.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await this.audit.log({
      action: 'delete', resource: 'product', resourceId: id, moduleId: 'inventory',
    });
  }
}
