import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ProductService } from '@/src/modules/inventory/services/product.service';
import { productSchema } from '@/src/modules/inventory/validators/product.schema';

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.read'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new ProductService(ctx.db, ctx.session.userId, ctx.audit);
    const product = await service.getById(id);
    return ok(product);
  },
);

export const PATCH = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.manage'], body: productSchema.partial() },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new ProductService(ctx.db, ctx.session.userId, ctx.audit);
    const product = await service.update(id, ctx.body);
    return ok(product);
  },
);

export const DELETE = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new ProductService(ctx.db, ctx.session.userId, ctx.audit);
    await service.softDelete(id);
    return ok({ message: 'Product deleted' });
  },
);
