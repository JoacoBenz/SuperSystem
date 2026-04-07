import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { PurchaseRequestService } from '@/src/modules/procurement/services/purchase-request.service';
import { createPurchaseRequestSchema } from '@/src/modules/procurement/validators/purchase-request.schema';

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_department', 'procurement.purchase_request.read_all'] },
  async (request, ctx) => {
    const { query } = ctx;

    if (query.get('count_only') === 'true') {
      const service = new PurchaseRequestService(ctx.db, ctx.session, ctx.audit);
      const result = await service.list({
        status: query.get('status') ?? undefined,
        pageSize: 0,
      });
      return Response.json({ count: result.total });
    }

    const service = new PurchaseRequestService(ctx.db, ctx.session, ctx.audit);
    const result = await service.list({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '20'),
      status: query.get('status') ?? undefined,
      urgency: query.get('urgency') ?? undefined,
      departmentId: query.get('department_id') ? parseInt(query.get('department_id')!) : undefined,
      search: query.get('search') ?? undefined,
      sort: query.get('sort') ?? undefined,
      order: (query.get('order') as 'asc' | 'desc') ?? undefined,
    });

    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.purchase_request.create'], body: createPurchaseRequestSchema },
  async (request, ctx) => {
    const service = new PurchaseRequestService(ctx.db, ctx.session, ctx.audit);
    const pr = await service.create(ctx.body);
    return created(pr);
  },
);
