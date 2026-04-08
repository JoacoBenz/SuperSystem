import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ProductCategoryService } from '@/src/modules/inventory/services/product-category.service';
import { productCategorySchema } from '@/src/modules/inventory/validators/product-category.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product_category.read'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new ProductCategoryService(ctx.db, ctx.audit);
    const cat = await service.getById(id);
    return ok(cat);
  },
);

export const PATCH = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product_category.manage'], body: productCategorySchema.partial() },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new ProductCategoryService(ctx.db, ctx.audit);
    const cat = await service.update(id, ctx.body);
    return ok(cat);
  },
);

export const DELETE = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product_category.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new ProductCategoryService(ctx.db, ctx.audit);
    await service.softDelete(id);
    return ok({ message: 'Category deleted' });
  },
);
