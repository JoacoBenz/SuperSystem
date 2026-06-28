import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { computeAging } from '@/src/modules/accounting/aging';

const p = prisma as any;
const OPEN = { in: ['draft', 'issued', 'approved'] };

/**
 * AR + AP aging: outstanding invoices bucketed by days past due.
 * Pure bucketing lives in `computeAging` (unit-tested); this route just fetches.
 */
export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.report.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const asOf = new Date();

    const [ar, ap] = await Promise.all([
      p.aRInvoice.findMany({
        where: { tenantId, status: OPEN },
        select: { id: true, invoiceNumber: true, dueDate: true, total: true, paidAmount: true, status: true, customer: { select: { name: true } } },
      }),
      p.aPInvoice.findMany({
        where: { tenantId, status: OPEN },
        select: { id: true, invoiceNumber: true, dueDate: true, total: true, paidAmount: true, status: true, vendor: { select: { name: true } } },
      }),
    ]);

    const receivables = computeAging(
      ar.map((i: any) => ({ id: i.id, invoiceNumber: i.invoiceNumber, partner: i.customer?.name ?? 'Customer', dueDate: i.dueDate, total: i.total, paidAmount: i.paidAmount, status: i.status })),
      asOf,
    );
    const payables = computeAging(
      ap.map((i: any) => ({ id: i.id, invoiceNumber: i.invoiceNumber, partner: i.vendor?.name ?? 'Vendor', dueDate: i.dueDate, total: i.total, paidAmount: i.paidAmount, status: i.status })),
      asOf,
    );

    return ok({ asOf: asOf.toISOString(), receivables, payables });
  },
);
