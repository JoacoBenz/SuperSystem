import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createItemSchema = z.object({
  budgetId: z.number().int(),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  plannedAmount: z.number().min(0).optional(),
  actualAmount: z.number().min(0).optional(),
});

export const GET = withAuth(
  { moduleId: 'budget', permissions: ['budget.budget_item.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const budgetId = query.get('budgetId') ? parseInt(query.get('budgetId')!) : undefined;

    const where: Record<string, unknown> = { tenantId };
    if (budgetId) where.budgetId = budgetId;

    const [data, total] = await Promise.all([
      (prisma as any).budgetPlanItem.findMany({
        where,
        orderBy: [{ budgetId: 'asc' }, { category: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          budgetPlan: { select: { name: true, currency: true } },
        },
      }),
      (prisma as any).budgetPlanItem.count({ where }),
    ]);

    return paginated(
      data.map((item: any) => ({
        ...item,
        plannedAmount: Number(item.plannedAmount),
        actualAmount: Number(item.actualAmount),
        budgetName: item.budgetPlan?.name ?? null,
        currency: item.budgetPlan?.currency ?? 'USD',
        budgetPlan: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'budget', permissions: ['budget.budget_item.manage'], body: createItemSchema },
  async (_request, ctx) => {
    const { budgetId, category, description, plannedAmount, actualAmount } = ctx.body;
    const tenantId = ctx.session.tenantId;

    const item = await (prisma as any).budgetPlanItem.create({
      data: {
        budgetId,
        tenantId,
        category,
        description: description ?? null,
        plannedAmount: plannedAmount ?? 0,
        actualAmount: actualAmount ?? 0,
      },
    });

    return created({
      ...item,
      plannedAmount: Number(item.plannedAmount),
      actualAmount: Number(item.actualAmount),
    });
  },
);
