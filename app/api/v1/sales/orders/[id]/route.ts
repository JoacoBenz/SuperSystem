import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { decrementStockForSale, recordCOGS, notifyLowStock, postARInvoice } from '@/src/core/integration/postings';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.order.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const order = await (prisma as any).salesOrder.findFirst({
      where: { id, tenantId: ctx.session.tenantId },
      include: {
        customer: true,
        items: { orderBy: { id: 'asc' } },
      },
    });
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
    return ok({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((i: any) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'sales', permissions: ['sales.order.manage'], body: updateSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;

    const order = await (prisma as any).salesOrder.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);

    const prevStatus = order.status as string;
    const newStatus = ctx.body.status;

    const updateData: Record<string, unknown> = {};
    if (ctx.body.notes !== undefined) updateData.notes = ctx.body.notes;
    if (newStatus) {
      updateData.status = newStatus;
      if (newStatus === 'confirmed') updateData.confirmedAt = new Date();
      if (newStatus === 'shipped') updateData.shippedAt = new Date();
      if (newStatus === 'delivered') updateData.deliveredAt = new Date();
    }

    const updated = await (prisma as any).salesOrder.update({
      where: { id },
      data: updateData,
      include: { customer: { select: { id: true, name: true } } },
    });

    const ref = updated.orderNumber ?? `SO-${id}`;
    const userId = ctx.session.userId;

    // Shipping goods → reduce inventory stock (connected ERP behaviour)
    if (newStatus === 'shipped' && prevStatus !== 'shipped') {
      try {
        const lines = await decrementStockForSale(
          tenantId, userId,
          (order.items ?? []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity) })),
          ref,
        );
        if (lines > 0) {
          await ctx.audit.log({ action: 'update', resource: 'stock_adjustment', moduleId: 'inventory', eventType: 'workflow', newData: { via: 'sales_shipment', order: ref, lines } });
        }
        // Alert if any item dropped to a low level
        await notifyLowStock(tenantId, (order.items ?? []).map((i: any) => i.description));
      } catch { /* inventory not set up — non-fatal */ }
    }

    // Delivery completes the sale → raise an AR invoice (Dr Receivable / Cr Revenue)
    // instead of posting cash directly. Cash arrives when the invoice is paid.
    if (newStatus === 'delivered' && prevStatus !== 'delivered') {
      const amount = Number(updated.totalAmount) || 0;
      try {
        const p = prisma as any;
        const count = await p.aRInvoice.count({ where: { tenantId } });
        const invoiceNumber = 'INV-' + String(count + 1).padStart(5, '0');
        const issueDate = new Date();
        const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const invoice = await p.aRInvoice.create({
          data: {
            tenantId,
            customerId: order.customerId,
            salesOrderId: order.id,
            invoiceNumber,
            status: 'issued',
            issueDate,
            dueDate,
            subtotal: amount,
            taxAmount: 0,
            total: amount,
            paidAmount: 0,
            currency: updated.currency ?? 'USD',
            createdBy: userId,
            issuedAt: issueDate,
            items: {
              create: (order.items ?? []).map((i: any) => ({
                tenantId,
                description: i.description,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
                lineTotal: Number(i.totalPrice),
              })),
            },
          },
        });
        const posted = await postARInvoice(tenantId, userId, { invoiceNumber, total: amount });
        // Cost of goods sold → Dr COGS / Cr Inventory (keeps margin + inventory value real)
        await recordCOGS(tenantId, userId, (order.items ?? []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity) })), invoiceNumber);
        await ctx.audit.log({ action: 'create', resource: 'ar_invoice', resourceId: invoice.id, moduleId: 'sales', eventType: 'workflow', newData: { via: 'sales_delivered', order: ref, invoiceNumber, amount, accounting: posted } });
      } catch { /* AR/accounting not set up — non-fatal */ }
    }

    return ok({ ...updated, totalAmount: Number(updated.totalAmount) });
  },
);
