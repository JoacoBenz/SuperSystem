import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { postARInvoice } from '@/src/core/integration/postings';
import { serializeARInvoice } from '../route';
import { z } from 'zod';

const p = prisma as any;

const patchSchema = z.object({ action: z.enum(['issue', 'void']) });

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const invoice = await p.aRInvoice.findFirst({
      where: { id, tenantId: ctx.session.tenantId },
      include: { customer: { select: { id: true, name: true } }, items: { orderBy: { id: 'asc' } }, _count: { select: { items: true } } },
    });
    if (!invoice) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);
    return ok(serializeARInvoice(invoice));
  },
);

export const PATCH = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.manage'], body: patchSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;
    const invoice = await p.aRInvoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);

    if (ctx.body.action === 'issue') {
      if (invoice.status !== 'draft') throw new ApiError('BAD_REQUEST', `Only draft invoices can be issued (is ${invoice.status})`, 400);
      const posted = await postARInvoice(tenantId, ctx.session.userId, { invoiceNumber: invoice.invoiceNumber, total: Number(invoice.total) });
      const updated = await p.aRInvoice.update({ where: { id }, data: { status: 'issued', issuedAt: new Date() } });
      await ctx.audit.log({ action: 'update', resource: 'ar_invoice', resourceId: id, moduleId: 'sales', eventType: 'workflow', newData: { action: 'issue', posted } });
      return ok(serializeARInvoice(updated));
    }

    // void
    if (invoice.status === 'paid') throw new ApiError('BAD_REQUEST', 'Paid invoices cannot be voided', 400);
    const updated = await p.aRInvoice.update({ where: { id }, data: { status: 'void' } });
    await ctx.audit.log({ action: 'update', resource: 'ar_invoice', resourceId: id, moduleId: 'sales', eventType: 'workflow', newData: { action: 'void' } });
    return ok(serializeARInvoice(updated));
  },
);
