import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { CostCenterInput } from '../validators/cost-center.schema';
import { ApiError } from '@/src/core/api/errors';

export class CostCenterService {
  constructor(
    private db: TenantDB,
    private audit: AuditService,
  ) {}

  async list(params: { page?: number; pageSize?: number; active?: boolean }) {
    const { page = 1, pageSize = 50, active } = params;
    const where: Record<string, unknown> = { deletedAt: null };
    if (active !== undefined) where.active = active;

    const [data, total] = await Promise.all([
      this.db.costCenter.findMany({
        where: where as any,
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.costCenter.count({ where: where as any }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: number) {
    const cc = await this.db.costCenter.findUnique({ where: { id } });
    if (!cc || cc.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Cost center not found', 404);
    }
    return cc;
  }

  async create(input: CostCenterInput) {
    const cc = await this.db.costCenter.create({
      data: {
        name: input.name,
        code: input.code,
        annualBudget: input.annualBudget ?? null,
        monthlyBudget: input.monthlyBudget ?? null,
      } as any,
    });

    await this.audit.log({
      action: 'create', resource: 'cost_center', resourceId: cc.id, moduleId: 'procurement',
      newData: { name: cc.name, code: cc.code },
    });

    return cc;
  }

  async update(id: number, input: Partial<CostCenterInput>) {
    await this.getById(id);
    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.code) data.code = input.code;
    if (input.annualBudget !== undefined) data.annualBudget = input.annualBudget ?? null;
    if (input.monthlyBudget !== undefined) data.monthlyBudget = input.monthlyBudget ?? null;

    return this.db.costCenter.update({ where: { id }, data: data as any });
  }

  async softDelete(id: number) {
    await this.getById(id);
    await this.db.costCenter.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await this.audit.log({
      action: 'delete', resource: 'cost_center', resourceId: id, moduleId: 'procurement',
    });
  }
}
