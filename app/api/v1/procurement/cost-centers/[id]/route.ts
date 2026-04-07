import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { CostCenterService } from '@/src/modules/procurement/services/cost-center.service';
import { costCenterSchema } from '@/src/modules/procurement/validators/cost-center.schema';

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.cost_center.read'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new CostCenterService(ctx.db, ctx.audit);
    const cc = await service.getById(id);
    return ok(cc);
  },
);

export const PATCH = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.cost_center.manage'], body: costCenterSchema.partial() },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new CostCenterService(ctx.db, ctx.audit);
    const cc = await service.update(id, ctx.body);
    return ok(cc);
  },
);

export const DELETE = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.cost_center.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new CostCenterService(ctx.db, ctx.audit);
    await service.softDelete(id);
    return ok({ message: 'Cost center deleted' });
  },
);
