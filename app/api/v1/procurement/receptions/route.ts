import { withAuth } from '@/src/core/api/handler';
import { created, ok } from '@/src/core/api/response';
import { receptionSchema } from '@/src/modules/procurement/validators/reception.schema';
import { ApiError } from '@/src/core/api/errors';

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.reception.read'] },
  async (request, ctx) => {
    const { db, query } = ctx;
    const purchaseRequestId = query.get('purchase_request_id');

    const where: Record<string, unknown> = {};
    if (purchaseRequestId) where.purchaseRequestId = parseInt(purchaseRequestId);

    const data = await db.reception.findMany({
      where: where as any,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return ok(data);
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.reception.create'], body: receptionSchema },
  async (request, ctx) => {
    const { body, db, session, audit } = ctx;

    // Verify purchase request exists and is in correct state
    const pr = await db.purchaseRequest.findUnique({
      where: { id: body.purchaseRequestId },
    });

    if (!pr) throw new ApiError('NOT_FOUND', 'Purchase request not found', 404);
    if (pr.status !== 'purchased') {
      throw new ApiError('BAD_REQUEST', 'Purchase request must be in "purchased" state to record reception', 400);
    }

    const reception = await db.reception.create({
      data: {
        tenantId: session.tenantId,
        purchaseRequestId: body.purchaseRequestId,
        receiverId: session.userId,
        conforming: body.conforming,
        issueType: body.issueType ?? null,
        notes: body.notes ?? null,
        items: body.items ? {
          create: body.items.map(item => ({
            tenantId: session.tenantId,
            purchaseRequestItemId: item.purchaseRequestItemId,
            quantityReceived: Number(item.quantityReceived),
            conforming: item.conforming,
            notes: item.notes ?? null,
          })),
        } : undefined,
      },
      include: { items: true },
    });

    // Update purchase request status
    const newStatus = body.conforming ? 'received' : 'received_with_issues';
    await db.purchaseRequest.update({
      where: { id: body.purchaseRequestId },
      data: { status: newStatus, version: { increment: 1 } },
    });

    await audit.log({
      action: 'create', resource: 'reception', resourceId: reception.id, moduleId: 'procurement',
      eventType: 'workflow',
      newData: { purchaseRequestId: body.purchaseRequestId, conforming: body.conforming },
    });

    return created(reception);
  },
);
