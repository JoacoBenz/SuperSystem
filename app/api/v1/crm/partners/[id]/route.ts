import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const p = prisma as any;

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  taxId: z.string().max(100).optional().nullable(),
  roles: z.enum(['customer', 'vendor', 'both']).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

async function loadId(ctx: any) {
  const id = parseInt(ctx.params.id as string);
  if (Number.isNaN(id)) throw new ApiError('NOT_FOUND', 'Partner not found', 404);
  const partner = await p.businessPartner.findFirst({ where: { id, tenantId: ctx.session.tenantId, deletedAt: null }, include: { contacts: true } });
  if (!partner) throw new ApiError('NOT_FOUND', 'Partner not found', 404);
  return { id, partner };
}

// GET returns the partner plus a 360° view: linked customer/vendor/company records
// and their sales orders, AR invoices, AP invoices and purchase requests.
export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.partner.read'] },
  async (_request, ctx) => {
    const { id, partner } = await loadId(ctx);
    const tenantId = ctx.session.tenantId;

    const [customers, vendors, companies] = await Promise.all([
      p.customer.findMany({ where: { tenantId, businessPartnerId: id }, select: { id: true, name: true } }),
      p.vendor.findMany({ where: { tenantId, businessPartnerId: id, deletedAt: null }, select: { id: true, name: true } }),
      p.crmCompany.findMany({ where: { tenantId, businessPartnerId: id }, select: { id: true, name: true } }),
    ]);
    const custIds = customers.map((c: any) => c.id);
    const vendIds = vendors.map((v: any) => v.id);

    const [salesOrders, arInvoices, apInvoices, purchaseRequests] = await Promise.all([
      custIds.length ? p.salesOrder.findMany({ where: { tenantId, customerId: { in: custIds } }, select: { id: true, orderNumber: true, status: true, totalAmount: true }, orderBy: { createdAt: 'desc' }, take: 50 }) : [],
      custIds.length ? p.aRInvoice.findMany({ where: { tenantId, customerId: { in: custIds } }, select: { id: true, invoiceNumber: true, status: true, total: true, paidAmount: true }, orderBy: { createdAt: 'desc' }, take: 50 }) : [],
      vendIds.length ? p.aPInvoice.findMany({ where: { tenantId, vendorId: { in: vendIds } }, select: { id: true, invoiceNumber: true, status: true, total: true, paidAmount: true }, orderBy: { createdAt: 'desc' }, take: 50 }) : [],
      vendIds.length ? p.purchaseRequest.findMany({ where: { tenantId, vendorId: { in: vendIds }, deletedAt: null }, select: { id: true, number: true, status: true }, orderBy: { createdAt: 'desc' }, take: 50 }) : [],
    ]);

    const out = (i: any) => Number(i.total) - Number(i.paidAmount);
    const openSum = (arr: any[]) => arr.filter(i => !['paid', 'void'].includes(i.status)).reduce((s, i) => s + out(i), 0);

    return ok({
      ...partner,
      links: { customers, vendors, companies },
      activity: {
        salesOrders: salesOrders.map((o: any) => ({ ...o, totalAmount: Number(o.totalAmount) })),
        arInvoices: arInvoices.map((i: any) => ({ ...i, total: Number(i.total), paidAmount: Number(i.paidAmount), outstanding: out(i) })),
        apInvoices: apInvoices.map((i: any) => ({ ...i, total: Number(i.total), paidAmount: Number(i.paidAmount), outstanding: out(i) })),
        purchaseRequests,
        totals: { arOutstanding: openSum(arInvoices), apOutstanding: openSum(apInvoices), salesOrders: salesOrders.length, purchaseRequests: purchaseRequests.length },
      },
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'crm', permissions: ['crm.partner.manage'], body: updateSchema },
  async (_request, ctx) => {
    const { id } = await loadId(ctx);
    const b = ctx.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'taxId', 'roles', 'email', 'phone', 'address', 'notes', 'active']) if (b[k] !== undefined) data[k] = b[k];
    const partner = await p.businessPartner.update({ where: { id }, data });
    return ok(partner);
  },
);

export const DELETE = withAuth(
  { moduleId: 'crm', permissions: ['crm.partner.manage'] },
  async (_request, ctx) => {
    const { id } = await loadId(ctx);
    await p.businessPartner.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    return ok({ message: 'Partner archived' });
  },
);
