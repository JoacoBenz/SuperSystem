import { withAuth } from '@/src/core/api/handler';
import { ok, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { z } from 'zod';

const createQuotationSchema = z.object({
  vendorName: z.string().min(1).max(255),
  vendorId: z.number().int().positive().optional(),
  amount: z.number().positive(),
  currency: z.string().max(10).default('USD'),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_all', 'procurement.purchase_request.read_department'] },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);
    const quotations = await ctx.db.quotation.findMany({
      where: { purchaseRequestId: prId },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return ok(quotations.map(q => ({ ...q, amount: Number(q.amount) })));
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.quotation.manage', 'procurement.purchase_request.create', 'procurement.purchase_request.update_own'], body: createQuotationSchema },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);
    const pr = await ctx.db.purchaseRequest.findUnique({ where: { id: prId } });
    if (!pr || pr.deletedAt) throw new ApiError('NOT_FOUND', 'Purchase request not found', 404);
    if (['purchased', 'received', 'received_with_issues', 'rejected', 'cancelled', 'closed'].includes(pr.status)) {
      throw new ApiError('BAD_REQUEST', 'Cannot add quotations to a PR in this state', 400);
    }

    const { vendorName, vendorId, amount, currency, notes, validUntil } = ctx.body;
    const q = await ctx.db.quotation.create({
      data: {
        tenantId: ctx.session.tenantId,
        purchaseRequestId: prId,
        vendorId: vendorId ?? null,
        vendorName,
        amount,
        currency,
        notes: notes ?? null,
        validUntil: validUntil ? new Date(validUntil) : null,
        createdBy: ctx.session.userId,
      } as any,
      include: { vendor: { select: { id: true, name: true } } },
    });
    return created({ ...q, amount: Number(q.amount) });
  },
);
