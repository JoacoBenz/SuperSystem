import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { PurchaseRequestService } from '@/src/modules/procurement/services/purchase-request.service';
import { transitionSchema } from '@/src/modules/procurement/validators/purchase-request.schema';

export const POST = withAuth(
  { moduleId: 'procurement', body: transitionSchema },
  async (request, ctx) => {
    const id = parseInt(ctx.params.id);
    const { action, notes, version } = ctx.body;

    const service = new PurchaseRequestService(ctx.db, ctx.session, ctx.audit);
    const result = await service.transition(id, action, notes, version);

    return ok(result);
  },
);
