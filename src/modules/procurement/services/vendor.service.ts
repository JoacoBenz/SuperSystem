import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { VendorInput } from '../validators/vendor.schema';
import { ApiError } from '@/src/core/api/errors';

export class VendorService {
  constructor(
    private db: TenantDB,
    private userId: number,
    private audit: AuditService,
  ) {}

  async list(params: { page?: number; pageSize?: number; search?: string; active?: boolean }) {
    const { page = 1, pageSize = 20, search, active } = params;
    const where: Record<string, unknown> = { deletedAt: null };

    if (active !== undefined) where.active = active;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.vendor.findMany({
        where: where as any,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.vendor.count({ where: where as any }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: number) {
    const vendor = await this.db.vendor.findUnique({ where: { id } });
    if (!vendor || vendor.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Vendor not found', 404);
    }
    return vendor;
  }

  async create(input: VendorInput) {
    const vendor = await this.db.vendor.create({
      data: {
        ...input,
        createdBy: this.userId,
        updatedBy: this.userId,
      } as any,
    });

    await this.audit.log({
      action: 'create', resource: 'vendor', resourceId: vendor.id, moduleId: 'procurement',
      newData: { name: vendor.name },
    });

    return vendor;
  }

  async update(id: number, input: Partial<VendorInput>) {
    const existing = await this.getById(id);

    const vendor = await this.db.vendor.update({
      where: { id },
      data: { ...input, updatedBy: this.userId, version: { increment: 1 } } as any,
    });

    await this.audit.log({
      action: 'update', resource: 'vendor', resourceId: id, moduleId: 'procurement',
      previousData: { name: existing.name },
      newData: { name: vendor.name },
    });

    return vendor;
  }

  async softDelete(id: number) {
    await this.getById(id);
    await this.db.vendor.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await this.audit.log({
      action: 'delete', resource: 'vendor', resourceId: id, moduleId: 'procurement',
    });
  }
}
