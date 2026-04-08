import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { PurchaseRequestService } from '@/src/modules/procurement/services/purchase-request.service';

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_department', 'procurement.purchase_request.read_all'] },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const service = new PurchaseRequestService(ctx.db, ctx.session, ctx.audit);
    const pr = await service.getById(id);
    return ok(pr);
  },
);
