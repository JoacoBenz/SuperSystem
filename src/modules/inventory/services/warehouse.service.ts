import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { WarehouseInput } from '../validators/warehouse.schema';
import { ApiError } from '@/src/core/api/errors';

export class WarehouseService {
  constructor(
    private db: TenantDB,
    private audit: AuditService,
  ) {}

  async list(params: { page?: number; pageSize?: number; active?: boolean }) {
    const { page = 1, pageSize = 50, active } = params;
    const where: Record<string, unknown> = { deletedAt: null };
    if (active !== undefined) where.active = active;

    const [data, total] = await Promise.all([
      this.db.warehouse.findMany({
        where: where as any,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.warehouse.count({ where: where as any }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: number) {
    const wh = await this.db.warehouse.findUnique({ where: { id } });
    if (!wh || wh.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Warehouse not found', 404);
    }
    return wh;
  }

  async create(input: WarehouseInput) {
    let wh;
    try {
      wh = await this.db.warehouse.create({
        data: input as any,
      });
    } catch (err: any) {
      if (err.code === 'P2002') throw new ApiError('VALIDATION', 'A warehouse with this code already exists', 409);
      throw err;
    }

    await this.audit.log({
      action: 'create', resource: 'warehouse', resourceId: wh.id, moduleId: 'inventory',
      newData: { name: wh.name, code: wh.code },
    });

    return wh;
  }

  async update(id: number, input: Partial<WarehouseInput>) {
    await this.getById(id);
    return this.db.warehouse.update({
      where: { id },
      data: input as any,
    });
  }

  async softDelete(id: number) {
    await this.getById(id);
    await this.db.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await this.audit.log({
      action: 'delete', resource: 'warehouse', resourceId: id, moduleId: 'inventory',
    });
  }
}
