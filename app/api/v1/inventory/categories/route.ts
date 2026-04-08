import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { ProductCategoryService } from '@/src/modules/inventory/services/product-category.service';
import { productCategorySchema } from '@/src/modules/inventory/validators/product-category.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product_category.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new ProductCategoryService(ctx.db, ctx.audit);
    const result = await service.list({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '50'),
      active: query.has('active') ? query.get('active') === 'true' : undefined,
    });
    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);

export const POST = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product_category.manage'], body: productCategorySchema },
  async (request, ctx) => {
    const service = new ProductCategoryService(ctx.db, ctx.audit);
    const cat = await service.create(ctx.body);
    return created(cat);
  },
);
