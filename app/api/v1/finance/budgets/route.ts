import { withAuth } from '@/src/core/api/handler';
import { ok, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { z } from 'zod';

const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  costCenterId: z.number().int().optional(),
  departmentId: z.number().int().optional(),
  fiscalYear: z.number().int().min(2020).max(2099),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'finance', permissionsAny: ['finance.budget.read'] },
  async (request, ctx) => {
    const fiscalYear = ctx.query.get('fiscalYear');

    const where: Record<string, unknown> = {};
    if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);

    const budgets = await (ctx.db as any).budget.findMany({
      where,
      include: {
        costCenter: true,
        department: true,
      },
      orderBy: { fiscalYear: 'desc' },
    });

    return ok(budgets.map((b: any) => ({ ...b, amount: Number(b.amount) })));
  },
);

export const POST = withAuth(
  { moduleId: 'finance', permissions: ['finance.budget.manage'], body: createBudgetSchema },
  async (request, ctx) => {
    const { name, costCenterId, departmentId, fiscalYear, amount, currency, notes } = ctx.body;

    let budget: unknown;
    try {
      budget = await (ctx.db as any).budget.create({
        data: {
          name,
          costCenterId: costCenterId ?? null,
          departmentId: departmentId ?? null,
          fiscalYear,
          amount,
          currency,
          notes: notes ?? null,
          createdBy: ctx.session.userId,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2009' || err?.message?.includes('Unknown field') || err instanceof TypeError) {
        throw new ApiError('SERVICE_UNAVAILABLE', 'Budget model is not available yet', 503);
      }
      throw err;
    }

    return created(budget);
  },
);
