import { withAuth } from '@/src/core/api/handler';
import { paginated } from '@/src/core/api/response';
import { PurchaseRequestService } from '@/src/modules/procurement/services/purchase-request.service';

// Purchase Orders page shows purchase requests in buyer-relevant states
const BUYER_STATUSES = ['in_procurement', 'payment_scheduled', 'purchased', 'received', 'received_with_issues', 'closed'];

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.purchase_order.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new PurchaseRequestService(ctx.db, ctx.session, ctx.audit);

    const status = query.get('status') ?? undefined;
    const effectiveStatus = status && BUYER_STATUSES.includes(status) ? status : undefined;

    const result = await service.listForBuyer({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '20'),
      status: effectiveStatus,
      statuses: effectiveStatus ? undefined : BUYER_STATUSES,
      search: query.get('search') ?? undefined,
    });

    return paginated(result.data, result.total, result.page, result.totalPages);
  },
);
