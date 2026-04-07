import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { VendorService } from '@/src/modules/procurement/services/vendor.service';
import { vendorSchema } from '@/src/modules/procurement/validators/vendor.schema';

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.vendor.read'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new VendorService(ctx.db, ctx.session.userId, ctx.audit);
    const vendor = await service.getById(id);
    return ok(vendor);
  },
);

export const PATCH = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.vendor.manage'], body: vendorSchema.partial() },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new VendorService(ctx.db, ctx.session.userId, ctx.audit);
    const vendor = await service.update(id, ctx.body);
    return ok(vendor);
  },
);

export const DELETE = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.vendor.manage'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new VendorService(ctx.db, ctx.session.userId, ctx.audit);
    await service.softDelete(id);
    return ok({ message: 'Vendor deleted' });
  },
);
