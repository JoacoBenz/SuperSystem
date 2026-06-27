import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  taxId: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'sales', permissions: ['sales.customer.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;

    const where: Record<string, unknown> = { tenantId, active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      (prisma as any).customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { salesOrders: true } } },
      }),
      (prisma as any).customer.count({ where }),
    ]);

    return paginated(
      data.map((c: any) => ({ ...c, orderCount: c._count.salesOrders })),
      total, page, pageSize
    );
  },
);

export const POST = withAuth(
  { moduleId: 'sales', permissions: ['sales.customer.manage'], body: customerSchema },
  async (_request, ctx) => {
    const { name, email, phone, address, taxId, notes } = ctx.body;
    const customer = await (prisma as any).customer.create({
      data: {
        tenantId: ctx.session.tenantId,
        name,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        taxId: taxId ?? null,
        notes: notes ?? null,
        createdBy: ctx.session.userId,
      },
    });
    return created(customer);
  },
);
