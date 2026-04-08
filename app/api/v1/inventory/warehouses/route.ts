import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { WarehouseService } from '@/src/modules/inventory/services/warehouse.service';
import { warehouseSchema } from '@/src/modules/inventory/validators/warehouse.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.warehouse.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new WarehouseService(ctx.db, ctx.audit);
    const result = await service.list({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '50'),
      active: query.has('active') ? query.get('active') === 'true' : undefined,
    });
    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);

export const POST = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.warehouse.manage'], body: warehouseSchema },
  async (request, ctx) => {
    const service = new WarehouseService(ctx.db, ctx.audit);
    const wh = await service.create(ctx.body);
    return created(wh);
  },
);
