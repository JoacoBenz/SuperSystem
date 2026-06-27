import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  fiscalYear: z.number().int(),
  period: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  currency: z.string().max(3).optional(),
  department: z.string().max(100).optional(),
  description: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'budget', permissions: ['budget.budget.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;
    const status = query.get('status') ?? undefined;
    const fiscalYear = query.get('fiscalYear') ? parseInt(query.get('fiscalYear')!) : undefined;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (fiscalYear) where.fiscalYear = fiscalYear;

    const [data, total] = await Promise.all([
      (prisma as any).budgetPlan.findMany({
        where,
        orderBy: [{ fiscalYear: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { items: true } },
        },
      }),
      (prisma as any).budgetPlan.count({ where }),
    ]);

    return paginated(
      data.map((b: any) => ({
        ...b,
        totalAmount: Number(b.totalAmount),
        itemCount: b._count.items,
        _count: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'budget', permissions: ['budget.budget.manage'], body: createBudgetSchema },
  async (_request, ctx) => {
    const { name, fiscalYear, period, currency, department, description } = ctx.body;
    const budget = await (prisma as any).budgetPlan.create({
      data: {
        tenantId: ctx.session.tenantId,
        name,
        fiscalYear,
        period: period ?? 'annual',
        currency: currency ?? 'USD',
        department: department ?? null,
        description: description ?? null,
        createdBy: ctx.session.userId,
      },
    });
    return created({ ...budget, totalAmount: Number(budget.totalAmount) });
  },
);
