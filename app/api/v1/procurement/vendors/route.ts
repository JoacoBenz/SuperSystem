import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { VendorService } from '@/src/modules/procurement/services/vendor.service';
import { vendorSchema } from '@/src/modules/procurement/validators/vendor.schema';

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.vendor.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new VendorService(ctx.db, ctx.session.userId, ctx.audit);
    const result = await service.list({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '20'),
      search: query.get('search') ?? undefined,
      active: query.get('active') !== null ? query.get('active') === 'true' : undefined,
    });
    return paginated(result.data, result.total, result.page, parseInt(query.get('limit') ?? '20'));
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.vendor.manage'], body: vendorSchema },
  async (request, ctx) => {
    const service = new VendorService(ctx.db, ctx.session.userId, ctx.audit);
    const vendor = await service.create(ctx.body);
    return created(vendor);
  },
);
