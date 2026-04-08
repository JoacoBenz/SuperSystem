import { withAuth } from '@/src/core/api/handler';
import { paginated } from '@/src/core/api/response';
import { StockService } from '@/src/modules/inventory/services/stock.service';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.stock_level.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new StockService(ctx.db, ctx.session.tenantId, ctx.session.userId, ctx.audit);
    const result = await service.listLevels({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '20'),
      warehouseId: query.has('warehouse_id') ? parseInt(query.get('warehouse_id')!) : undefined,
      productId: query.has('product_id') ? parseInt(query.get('product_id')!) : undefined,
      lowStockOnly: query.get('low_stock') === 'true',
    });
    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);
