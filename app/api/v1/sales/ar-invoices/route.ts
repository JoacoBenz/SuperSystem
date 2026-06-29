import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { nextDocumentNumber } from '@/src/core/integration/numbering';
import { z } from 'zod';

const p = prisma as any;

const createSchema = z.object({
  customerId: z.number().int().positive(),
  currency: z.string().default('USD'),
  dueDate: z.string().optional(), // ISO date; defaults to +30 days
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export function serializeARInvoice(o: any) {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    taxAmount: Number(o.taxAmount),
    total: Number(o.total),
    paidAmount: Number(o.paidAmount),
    outstanding: Number(o.total) - Number(o.paidAmount),
    itemCount: o._count?.items,
    customerName: o.customer?.name,
    items: o.items?.map((i: any) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) })),
  };
}

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '20');
    const status = query.get('status') ?? undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      p.aRInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      }),
      p.aRInvoice.count({ where }),
    ]);

    return paginated(data.map(serializeARInvoice), total, page, pageSize);
  },
);

export const POST = withAuth(
  { moduleId: 'sales', permissions: ['sales.invoice.manage'], body: createSchema },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const b = ctx.body;

    const customer = await p.customer.findFirst({ where: { id: b.customerId, tenantId } });
    if (!customer) throw new ApiError('NOT_FOUND', 'Customer not found', 404);

    const subtotal = b.items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
    const total = subtotal + (b.taxAmount ?? 0);
    const invoiceNumber = await nextDocumentNumber(p, tenantId, 'INV', {
      prefix: 'INV-', pad: 5, seed: () => p.aRInvoice.count({ where: { tenantId } }),
    });
    const issueDate = new Date();
    const dueDate = b.dueDate ? new Date(b.dueDate) : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await p.aRInvoice.create({
      data: {
        tenantId,
        customerId: b.customerId,
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
          create: b.items.map((i: any) => ({ tenantId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.quantity * i.unitPrice })),
        },
      },
      include: { customer: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    });

    await ctx.audit.log({ action: 'create', resource: 'ar_invoice', resourceId: invoice.id, moduleId: 'sales', eventType: 'data_change', newData: { invoiceNumber, total } });
    return created(serializeARInvoice(invoice));
  },
);
