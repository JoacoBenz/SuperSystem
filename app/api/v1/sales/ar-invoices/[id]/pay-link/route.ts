import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { getPaymentProvider } from '@/src/core/providers/payments';

const p = prisma as any;

/** Generate a customer payment link for an AR invoice (Mercado Pago when configured, else a stub link). */
export const POST = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.manage'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    if (Number.isNaN(id)) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);
    const inv = await p.aRInvoice.findFirst({ where: { id, tenantId: ctx.session.tenantId } });
    if (!inv) throw new ApiError('NOT_FOUND', 'Invoice not found', 404);
    if (inv.status === 'paid') throw new ApiError('BAD_REQUEST', 'Invoice is already paid', 400);
    if (inv.status === 'void') throw new ApiError('BAD_REQUEST', 'Invoice is void', 400);

    const outstanding = Number(inv.total) - Number(inv.paidAmount);
    const provider = await getPaymentProvider(ctx.session.tenantId);
    let result;
    try {
      result = await provider.createPayLink({ invoiceNumber: inv.invoiceNumber, amount: outstanding, currency: inv.currency, description: `Invoice ${inv.invoiceNumber}` });
    } catch (e) {
      throw new ApiError('PROVIDER_ERROR', 'Payment provider error: ' + (e instanceof Error ? e.message : String(e)), 502);
    }

    await ctx.audit.log({ action: 'create', resource: 'pay_link', resourceId: id, moduleId: 'sales', eventType: 'workflow', newData: { invoice: inv.invoiceNumber, provider: result.provider } });
    return ok({ url: result.url, provider: result.provider, external: result.external, amount: outstanding });
  },
);
