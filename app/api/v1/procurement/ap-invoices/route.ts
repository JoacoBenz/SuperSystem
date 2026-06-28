import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const p = prisma as any;

const createSchema = z.object({
  vendorId: z.number().int().positive().optional(),
  vendorInvoiceNumber: z.string().max(100).optional(),
  currency: z.string().default('USD'),
  dueDate: z.string().optional(),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitCost: z.number().positive(),
  })).min(1),
});

export function serializeAPInvoice(o: any) {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    taxAmount: Number(o.taxAmount),
    total: Number(o.total),
    paidAmount: Number(o.paidAmount),
    outstanding: Number(o.total) - Number(o.paidAmount),
    itemCount: o._count?.items,
    vendorName: o.vendor?.name ?? null,
    items: o.items?.map((i: any) => ({ ...i, quantity: Number(i.quantity), unitCost: Number(i.unitCost), lineTotal: Number(i.lineTotal) })),
  };
}

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.invoice.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '20');
    const status = query.get('status') ?? undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      p.aPInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { vendor: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      }),
      p.aPInvoice.count({ where }),
    ]);

    return paginated(data.map(serializeAPInvoice), total, page, pageSize);
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.invoice.manage'], body: createSchema },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const b = ctx.body;

    if (b.vendorId) {
      const vendor = await p.vendor.findFirst({ where: { id: b.vendorId, tenantId } });
      if (!vendor) throw new ApiError('NOT_FOUND', 'Vendor not found', 404);
    }

    const subtotal = b.items.reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0);
    const total = subtotal + (b.taxAmount ?? 0);
    const count = await p.aPInvoice.count({ where: { tenantId } });
    const invoiceNumber = 'BILL-' + String(count + 1).padStart(5, '0');
    const issueDate = new Date();
    const dueDate = b.dueDate ? new Date(b.dueDate) : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await p.aPInvoice.create({
      data: {
        tenantId,
        vendorId: b.vendorId ?? null,
        vendorInvoiceNumber: b.vendorInvoiceNumber ?? null,
        invoiceNumber,
        status: 'draft',
        issueDate,
        dueDate,
        subtotal,
        taxAmount: b.taxAmount ?? 0,
        total,
        paidAmount: 0,
        currency: b.currency,
        notes: b.notes ?? null,
        createdBy: ctx.session.userId,
        items: {
          create: b.items.map((i: any) => ({ tenantId, description: i.description, quantity: i.quantity, unitCost: i.unitCost, lineTotal: i.quantity * i.unitCost })),
        },
      },
      include: { vendor: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    });

    await ctx.audit.log({ action: 'create', resource: 'ap_invoice', resourceId: invoice.id, moduleId: 'procurement', eventType: 'data_change', newData: { invoiceNumber, total } });
    return created(serializeAPInvoice(invoice));
  },
);
