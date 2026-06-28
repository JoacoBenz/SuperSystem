import { withAuth } from '@/src/core/api/handler';
import { created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { postInvoicePayment } from '@/src/core/integration/postings';
import { z } from 'zod';

const p = prisma as any;

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['bank', 'cash', 'card', 'transfer']).default('bank'),
  reference: z.string().max(100).optional(),
});

export const POST = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.manage'], body: paymentSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;
    const { amount, method, reference } = ctx.body;

    const invoice = await p.aRInvoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);
    if (invoice.status === 'draft') throw new ApiError('BAD_REQUEST', 'Issue the invoice before recording a payment', 400);
    if (invoice.status === 'void') throw new ApiError('BAD_REQUEST', 'Cannot pay a voided invoice', 400);

    const outstanding = Number(invoice.total) - Number(invoice.paidAmount);
    if (amount > outstanding + 0.0001) throw new ApiError('BAD_REQUEST', `Payment ${amount} exceeds outstanding ${outstanding.toFixed(2)}`, 400);

    const ref = reference ?? invoice.invoiceNumber;
    const payment = await p.payment.create({
      data: { tenantId, kind: 'AR', invoiceId: id, amount, method, reference: ref, createdBy: ctx.session.userId },
    });

    // Cash in (Treasury) + GL clearing (Dr Cash / Cr Receivable)
    await postInvoicePayment(tenantId, ctx.session.userId, { kind: 'AR', amount, reference: ref });

    const newPaid = Number(invoice.paidAmount) + amount;
    const fullyPaid = newPaid >= Number(invoice.total) - 0.0001;
    await p.aRInvoice.update({
      where: { id },
      data: { paidAmount: newPaid, status: fullyPaid ? 'paid' : invoice.status, paidAt: fullyPaid ? new Date() : invoice.paidAt },
    });

    await ctx.audit.log({ action: 'create', resource: 'payment', resourceId: payment.id, moduleId: 'sales', eventType: 'workflow', newData: { kind: 'AR', invoice: invoice.invoiceNumber, amount, fullyPaid } });
    return created({ id: payment.id, amount: Number(payment.amount), invoiceStatus: fullyPaid ? 'paid' : invoice.status, paidAmount: newPaid });
  },
);
