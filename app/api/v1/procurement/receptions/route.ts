import { withAuth } from '@/src/core/api/handler';
import { created, ok } from '@/src/core/api/response';
import { receptionSchema } from '@/src/modules/procurement/validators/reception.schema';
import { ApiError } from '@/src/core/api/errors';
import { StockService } from '@/src/modules/inventory';
import { recordTreasuryMovement, recordJournalEntry } from '@/src/core/integration/postings';
import { purchaseRequestWorkflow } from '@/src/modules/procurement/workflows/purchase-request.workflow';
import { TransitionError, GuardError } from '@/src/core/state-machine/errors';
import type { PurchaseRequestWorkflowContext } from '@/src/modules/procurement/types';
import { NotificationService } from '@/src/core/notifications/notification.service';

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

    // Fetch ALL PR items: needed for allItemsReceived check and stock entry mapping
    const allPrItems = await db.purchaseRequestItem.findMany({
      where: { purchaseRequestId: body.purchaseRequestId },
    });
    const prItemMap = new Map((allPrItems as any[]).map((i: any) => [i.id, i]));

    // Compute workflow context values
    const receivedItemIds = new Set(body.items?.map(i => i.purchaseRequestItemId) ?? []);
    const allItemsReceived = (allPrItems as any[]).every((i: any) => receivedItemIds.has(i.id));
    const hasIssues = !body.conforming || (body.items?.some(i => !i.conforming) ?? false);

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

    // Transition PR status through the workflow engine (guards + segregation apply)
    const context: PurchaseRequestWorkflowContext = {
      userId: session.userId,
      requesterId: (pr as any).requesterId,
      validatedById: (pr as any).validatedById ?? null,
      approvedById: (pr as any).approvedById ?? null,
      departmentId: (pr as any).departmentId,
      estimatedTotal: (pr as any).estimatedTotal ? Number((pr as any).estimatedTotal) : null,
      hasBuyerUsers: false, // not used by the record_reception branch logic
      receptionConforming: body.conforming,
      allItemsReceived,
      hasIssues,
    };

    const userPermissions = new Set(session.permissions as string[]);
    let newStatus: string;
    try {
      ({ newState: newStatus } = await purchaseRequestWorkflow.transition(pr.status, 'record_reception', context, userPermissions));
    } catch (err) {
      if (err instanceof GuardError) throw new ApiError('FORBIDDEN', err.reason, 403);
      if (err instanceof TransitionError) throw new ApiError('BAD_REQUEST', err.message, 400);
      throw err;
    }

    await db.purchaseRequest.update({
      where: { id: body.purchaseRequestId },
      data: { status: newStatus, version: { increment: 1 } },
    });

    await audit.log({
      action: 'create', resource: 'reception', resourceId: reception.id, moduleId: 'procurement',
      eventType: 'workflow',
      newData: { purchaseRequestId: body.purchaseRequestId, conforming: body.conforming, newStatus },
    });

    // Notify requester about reception
    const notifService = new NotificationService(session.tenantId);
    notifService.notifyUser(
      pr.requesterId,
      'pr_received',
      'Goods Reception Recorded',
      `Reception recorded for your PR ${pr.number} "${pr.title}"`,
      'purchase_request',
      pr.id,
    ).catch(() => {});

    // Create inventory stock entries for each received item (non-fatal if inventory not yet migrated)
    if (body.items?.length) {
      try {
      const stockService = new StockService(db, session.userId, audit);
      await stockService.createEntriesFromReception(
        reception.id,
        body.items.map(item => {
          const prItem = prItemMap.get(item.purchaseRequestItemId) as any;
          return {
            receptionId: reception.id,
            purchaseRequestItemId: item.purchaseRequestItemId,
            description: prItem?.description ?? 'Unknown item',
            quantity: Number(item.quantityReceived),
            unit: prItem?.unit ?? 'units',
            unitCost: prItem?.estimatedPrice ? Number(prItem.estimatedPrice) : null,
            vendorId: (pr as any).vendorId ?? null,
            conforming: item.conforming,
            notes: item.notes ?? null,
          };
        }),
      );
      } catch { /* inventory module not yet active */ }
    }

    // Completed purchase → cash out (Treasury) + expense posting (Accounting)
    const purchaseValue = (body.items ?? []).reduce((sum, item) => {
      const prItem = prItemMap.get(item.purchaseRequestItemId) as any;
      const unitCost = prItem?.estimatedPrice ? Number(prItem.estimatedPrice) : 0;
      return sum + Number(item.quantityReceived) * unitCost;
    }, 0);
    if (purchaseValue > 0) {
      try {
        const cash = await recordTreasuryMovement(session.tenantId, session.userId, { type: 'debit', amount: purchaseValue, description: `Payment for goods — ${pr.number}`, reference: pr.number });
        const posted = await recordJournalEntry(session.tenantId, session.userId, `Purchase ${pr.number}`, [
          { code: '5000', debit: purchaseValue, memo: `Expense ${pr.number}` },
          { code: '1000', credit: purchaseValue, memo: `Cash out ${pr.number}` },
        ]);
        if (cash || posted) {
          await audit.log({ action: 'create', resource: 'posting', moduleId: 'procurement', eventType: 'workflow', newData: { via: 'reception', pr: pr.number, amount: purchaseValue, treasury: cash, accounting: posted } });
        }
      } catch { /* treasury/accounting not set up — non-fatal */ }
    }

    return created(reception);
  },
);
