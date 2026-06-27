import { withAuth } from '@/src/core/api/handler';
import { ok, noContent } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { z } from 'zod';

const updateQuotationSchema = z.object({
  selected: z.boolean().optional(),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
  validUntil: z.string().optional(),
});

export const PATCH = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_all', 'procurement.purchase_request.read_department'], body: updateQuotationSchema },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);
    const qid = parseInt(ctx.params.qid);
    const q = await ctx.db.quotation.findUnique({ where: { id: qid } });
    if (!q || q.purchaseRequestId !== prId) throw new ApiError('NOT_FOUND', 'Quotation not found', 404);

    const { selected, notes, amount, validUntil } = ctx.body;

    // If selecting this quotation, unselect all others first
    if (selected) {
      await ctx.db.quotation.updateMany({
        where: { purchaseRequestId: prId, id: { not: qid } },
        data: { selected: false },
      });
    }

    const updated = await ctx.db.quotation.update({
      where: { id: qid },
      data: {
        ...(selected !== undefined && { selected }),
        ...(notes !== undefined && { notes }),
        ...(amount !== undefined && { amount }),
        ...(validUntil !== undefined && { validUntil: new Date(validUntil) }),
      } as any,
      include: { vendor: { select: { id: true, name: true } } },
    });
    return ok({ ...updated, amount: Number(updated.amount) });
  },
);

export const DELETE = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_all', 'procurement.purchase_request.read_department'] },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);
    const qid = parseInt(ctx.params.qid);
    const q = await ctx.db.quotation.findUnique({ where: { id: qid } });
    if (!q || q.purchaseRequestId !== prId) throw new ApiError('NOT_FOUND', 'Quotation not found', 404);
    await ctx.db.quotation.delete({ where: { id: qid } });
    return noContent();
  },
);
