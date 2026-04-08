import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { ProductService } from '@/src/modules/inventory/services/product.service';
import { productSchema } from '@/src/modules/inventory/validators/product.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new ProductService(ctx.db, ctx.session.userId, ctx.audit);
    const result = await service.list({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '20'),
      search: query.get('search') ?? undefined,
      categoryId: query.has('category_id') ? parseInt(query.get('category_id')!) : undefined,
      active: query.has('active') ? query.get('active') === 'true' : undefined,
    });
    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);

export const POST = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.manage'], body: productSchema },
  async (request, ctx) => {
    const service = new ProductService(ctx.db, ctx.session.userId, ctx.audit);
    const product = await service.create(ctx.body);
    return created(product);
  },
);
