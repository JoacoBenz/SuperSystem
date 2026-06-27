import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  description: z.string().optional().nullable(),
  department: z.string().max(100).optional().nullable(),
});

export const GET = withAuth(
  { moduleId: 'budget', permissions: ['budget.budget.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const id = parseInt(ctx.params?.id as string);

    const budget = await (prisma as any).budgetPlan.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!budget) {
      return NextResponse.json({ error: { message: 'Budget not found' } }, { status: 404 });
    }

    return ok({
      ...budget,
      totalAmount: Number(budget.totalAmount),
      items: budget.items.map((item: any) => ({
        ...item,
        plannedAmount: Number(item.plannedAmount),
        actualAmount: Number(item.actualAmount),
      })),
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'budget', permissions: ['budget.budget.manage'], body: updateBudgetSchema },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const id = parseInt(ctx.params?.id as string);

    const existing = await (prisma as any).budgetPlan.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: { message: 'Budget not found' } }, { status: 404 });
    }

    const { name, status, description, department } = ctx.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (description !== undefined) data.description = description;
    if (department !== undefined) data.department = department;

    const updated = await (prisma as any).budgetPlan.update({
      where: { id },
      data,
    });

    return ok({ ...updated, totalAmount: Number(updated.totalAmount) });
  },
);
