import { withAuth } from '@/src/core/api/handler';
import { created, paginated } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { purchaseRequestWorkflow } from '@/src/modules/procurement/workflows/purchase-request.workflow';
import { GuardError, TransitionError } from '@/src/core/state-machine/errors';
import { z } from 'zod';

const createPOSchema = z.object({
  purchaseRequestId: z.number().int().positive(),
  vendorName: z.string().min(1).max(255),
  vendorId: z.number().int().positive().optional(),
  vendorDetails: z.string().optional(),
  totalAmount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit_card', 'check', 'other']),
  bankReference: z.string().max(100).optional(),
  invoiceNumber: z.string().max(50).optional(),
  purchaseDate: z.string().refine(s => !isNaN(Date.parse(s))),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_order.read', 'procurement.purchase_order.create'] },
  async (request, ctx) => {
    const q = ctx.query;
    const page = parseInt(q.get('page') ?? '1');
    const pageSize = Math.min(parseInt(q.get('limit') ?? '20'), 100);
    const purchaseRequestId = q.get('purchaseRequestId') ? parseInt(q.get('purchaseRequestId')!) : undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (purchaseRequestId) where.purchaseRequestId = purchaseRequestId;

    const [data, total] = await Promise.all([
      ctx.db.purchaseOrder.findMany({
        where: where as any,
        include: {
          purchaseRequest: { select: { id: true, number: true, title: true, status: true } },
          vendor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      ctx.db.purchaseOrder.count({ where: where as any }),
    ]);

    return paginated(data, total, page, pageSize);
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.purchase_order.create'], body: createPOSchema },
  async (request, ctx) => {
    const { purchaseRequestId, vendorName, vendorId, vendorDetails, totalAmount, paymentMethod, bankReference, invoiceNumber, purchaseDate, notes } = ctx.body;

    const pr = await ctx.db.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: { items: true },
    });
    if (!pr || pr.deletedAt) throw new ApiError('NOT_FOUND', 'Purchase request not found', 404);
    if (!['approved', 'in_procurement', 'payment_scheduled'].includes(pr.status)) {
      throw new ApiError('BAD_REQUEST', `Cannot create PO for a PR in status ${pr.status}`, 400);
    }

    // Transition the PR
    const context = {
      userId: ctx.session.userId,
      requesterId: pr.requesterId,
      validatedById: pr.validatedById,
      approvedById: pr.approvedById,
      departmentId: pr.departmentId,
      estimatedTotal: pr.estimatedTotal ? Number(pr.estimatedTotal) : null,
      hasBuyerUsers: true,
      receptionConforming: true,
      allItemsReceived: false,
      hasIssues: false,
      budgetAvailable: true,
    };
    const userPermissions = new Set(ctx.session.permissions as string[]);
    let newStatus: string;
    try {
      ({ newState: newStatus } = await purchaseRequestWorkflow.transition(pr.status, 'record_purchase', context, userPermissions));
    } catch (err) {
      if (err instanceof GuardError) throw new ApiError('FORBIDDEN', err.reason, 403);
      if (err instanceof TransitionError) throw new ApiError('BAD_REQUEST', err.message, 400);
      throw err;
    }

    // Create PO + update PR atomically
    const [po] = await Promise.all([
      ctx.db.purchaseOrder.create({
        data: {
          tenantId: ctx.session.tenantId,
          purchaseRequestId,
          executedById: ctx.session.userId,
          vendorId: vendorId ?? null,
          vendorName,
          vendorDetails: vendorDetails ?? null,
          purchaseDate: new Date(purchaseDate),
          totalAmount,
          paymentMethod,
          bankReference: bankReference ?? null,
          invoiceNumber: invoiceNumber ?? null,
          notes: notes ?? null,
          createdBy: ctx.session.userId,
        } as any,
        include: { purchaseRequest: { select: { id: true, number: true, title: true } }, vendor: true },
      }),
      ctx.db.purchaseRequest.update({
        where: { id: purchaseRequestId },
        data: { status: newStatus, version: { increment: 1 }, updatedBy: ctx.session.userId } as any,
      }),
    ]);

    await ctx.audit.log({
      action: 'create',
      resource: 'purchase_order',
      resourceId: po.id,
      moduleId: 'procurement',
      newData: { purchaseRequestId, vendorName, totalAmount, paymentMethod },
    });

    return created(po);
  },
);
