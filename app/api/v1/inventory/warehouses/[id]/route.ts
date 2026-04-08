import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { WarehouseService } from '@/src/modules/inventory/services/warehouse.service';
import { warehouseSchema } from '@/src/modules/inventory/validators/warehouse.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.warehouse.read'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new WarehouseService(ctx.db, ctx.audit);
    const wh = await service.getById(id);
    return ok(wh);
  },
);

export const PATCH = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.warehouse.manage'], body: warehouseSchema.partial() },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new WarehouseService(ctx.db, ctx.audit);
    const wh = await service.update(id, ctx.body);
    return ok(wh);
  },
);

export const DELETE = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.warehouse.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new WarehouseService(ctx.db, ctx.audit);
    await service.softDelete(id);
    return ok({ message: 'Warehouse deleted' });
  },
);
