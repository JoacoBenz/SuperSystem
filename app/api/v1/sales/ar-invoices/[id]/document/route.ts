import { withAuth } from '@/src/core/api/handler';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { renderInvoiceDocument } from '@/src/core/documents/document.service';

const p = prisma as any;

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    if (Number.isNaN(id)) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);
    const inv = await p.aRInvoice.findFirst({
      where: { id, tenantId: ctx.session.tenantId },
      include: { customer: { select: { name: true } }, items: { orderBy: { id: 'asc' } } },
    });
    if (!inv) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);

    const html = renderInvoiceDocument({
      kind: 'AR',
      invoiceNumber: inv.invoiceNumber,
      partyLabel: 'Customer',
      partyName: inv.customer?.name ?? 'Customer',
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      currency: inv.currency,
      status: inv.status,
      items: (inv.items || []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) })),
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      total: Number(inv.total),
      paidAmount: Number(inv.paidAmount),
    });
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
);
