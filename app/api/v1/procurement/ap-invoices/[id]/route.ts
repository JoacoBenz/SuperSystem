import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { postAPInvoice, addBudgetActual } from '@/src/core/integration/postings';
import { serializeAPInvoice } from '../route';
import { z } from 'zod';

const p = prisma as any;

const patchSchema = z.object({ action: z.enum(['approve', 'void']) });

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.invoice.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const invoice = await p.aPInvoice.findFirst({
      where: { id, tenantId: ctx.session.tenantId },
      include: { vendor: { select: { id: true, name: true } }, items: { orderBy: { id: 'asc' } }, _count: { select: { items: true } } },
    });
    if (!invoice) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);
    return ok(serializeAPInvoice(invoice));
  },
);

export const PATCH = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.invoice.manage'], body: patchSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;
    const invoice = await p.aPInvoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);

    if (ctx.body.action === 'approve') {
      if (invoice.status !== 'draft') throw new ApiError('BAD_REQUEST', `Only draft invoices can be approved (is ${invoice.status})`, 400);
      const posted = await postAPInvoice(tenantId, ctx.session.userId, { invoiceNumber: invoice.invoiceNumber, total: Number(invoice.total) });
      await addBudgetActual(tenantId, Number(invoice.total), 'Procurement Spend');
      const updated = await p.aPInvoice.update({ where: { id }, data: { status: 'approved', approvedAt: new Date() } });
      await ctx.audit.log({ action: 'update', resource: 'ap_invoice', resourceId: id, moduleId: 'procurement', eventType: 'workflow', newData: { action: 'approve', posted } });
      return ok(serializeAPInvoice(updated));
    }

    // void
    if (invoice.status === 'paid') throw new ApiError('BAD_REQUEST', 'Paid invoices cannot be voided', 400);
    const updated = await p.aPInvoice.update({ where: { id }, data: { status: 'void' } });
    await ctx.audit.log({ action: 'update', resource: 'ap_invoice', resourceId: id, moduleId: 'procurement', eventType: 'workflow', newData: { action: 'void' } });
    return ok(serializeAPInvoice(updated));
  },
);
