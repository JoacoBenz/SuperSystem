import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createOrderSchema = z.object({
  customerId: z.number().int().positive(),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    productId: z.number().int().positive().optional(),
    notes: z.string().optional(),
  })).min(1),
});

async function nextOrderNumber(tenantId: number): Promise<string> {
  const count = await (prisma as any).salesOrder.count({ where: { tenantId } });
  return `SO-${String(count + 1).padStart(4, '0')}`;
}

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.order.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '20');
    const status = query.get('status') ?? undefined;
    const customerId = query.get('customerId') ? parseInt(query.get('customerId')!) : undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [data, total] = await Promise.all([
      (prisma as any).salesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      (prisma as any).salesOrder.count({ where }),
    ]);

    return paginated(
      data.map((o: any) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        itemCount: o._count.items,
      })),
      total, page, pageSize
    );
  },
);

export const POST = withAuth(
  { moduleId: 'sales', permissions: ['sales.order.manage'], body: createOrderSchema },
  async (_request, ctx) => {
    const { customerId, currency, notes, items } = ctx.body;
    const tenantId = ctx.session.tenantId;

    const customer = await (prisma as any).customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new Error('Customer not found');

    const totalAmount = items.reduce((sum: number, i: any) => sum + i.quantity * i.unitPrice, 0);
    const orderNumber = await nextOrderNumber(tenantId);

    const order = await (prisma as any).salesOrder.create({
      data: {
        tenantId,
        customerId,
        orderNumber,
        currency,
        notes: notes ?? null,
        totalAmount,
        createdBy: ctx.session.userId,
        items: {
          create: items.map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.quantity * i.unitPrice,
            productId: i.productId ?? null,
            notes: i.notes ?? null,
          })),
        },
      },
      include: { customer: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    });

    return created({ ...order, totalAmount: Number(order.totalAmount), itemCount: order._count.items });
  },
);
