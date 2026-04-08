import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { StockService } from '@/src/modules/inventory/services/stock.service';
import { stockMovementSchema } from '@/src/modules/inventory/validators/stock-movement.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.stock_movement.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new StockService(ctx.db, ctx.session.tenantId, ctx.session.userId, ctx.audit);
    const result = await service.listMovements({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '20'),
      productId: query.has('product_id') ? parseInt(query.get('product_id')!) : undefined,
      warehouseId: query.has('warehouse_id') ? parseInt(query.get('warehouse_id')!) : undefined,
      movementType: query.get('type') ?? undefined,
    });
    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);

export const POST = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.stock_movement.create'], body: stockMovementSchema },
  async (request, ctx) => {
    const service = new StockService(ctx.db, ctx.session.tenantId, ctx.session.userId, ctx.audit);
    const movement = await service.createMovement(ctx.body);
    return created(movement);
  },
);
