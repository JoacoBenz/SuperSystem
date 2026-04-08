import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { ProductCategoryInput } from '../validators/product-category.schema';
import { ApiError } from '@/src/core/api/errors';

export class ProductCategoryService {
  constructor(
    private db: TenantDB,
    private audit: AuditService,
  ) {}

  async list(params: { page?: number; pageSize?: number; active?: boolean }) {
    const { page = 1, pageSize = 50, active } = params;
    const where: Record<string, unknown> = { deletedAt: null };
    if (active !== undefined) where.active = active;

    const [data, total] = await Promise.all([
      this.db.productCategory.findMany({
        where: where as any,
        include: { parent: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.productCategory.count({ where: where as any }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: number) {
    const cat = await this.db.productCategory.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
    if (!cat || cat.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Product category not found', 404);
    }
    return cat;
  }

  async create(input: ProductCategoryInput) {
    let cat;
    try {
      cat = await this.db.productCategory.create({
        data: input as any,
      });
    } catch (err: any) {
      if (err.code === 'P2002') throw new ApiError('VALIDATION', 'A category with this name already exists', 409);
      throw err;
    }

    await this.audit.log({
      action: 'create', resource: 'product_category', resourceId: cat.id, moduleId: 'inventory',
      newData: { name: cat.name },
    });

    return cat;
  }

  async update(id: number, input: Partial<ProductCategoryInput>) {
    await this.getById(id);
    return this.db.productCategory.update({
      where: { id },
      data: input as any,
    });
  }

  async softDelete(id: number) {
    await this.getById(id);
    await this.db.productCategory.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await this.audit.log({
      action: 'delete', resource: 'product_category', resourceId: id, moduleId: 'inventory',
    });
  }
}
