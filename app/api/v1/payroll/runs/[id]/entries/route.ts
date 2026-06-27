import { withAuth } from '@/src/core/api/handler';
import { created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const addEntrySchema = z.object({
  userId: z.number().int().positive(),
  baseSalary: z.number().positive(),
  bonuses: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const POST = withAuth(
  { moduleId: 'payroll', permissions: ['payroll.run.manage'], body: addEntrySchema },
  async (_request, ctx) => {
    const runId = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;

    const run = await (prisma as any).payrollRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new ApiError('NOT_FOUND', 'Payroll run not found', 404);
    if (run.status !== 'draft') throw new ApiError('CONFLICT', 'Can only add entries to draft runs', 409);

    const { userId, baseSalary, bonuses, deductions, taxAmount, notes } = ctx.body;
    const netPay = baseSalary + bonuses - deductions - taxAmount;

    const entry = await (prisma as any).payrollEntry.create({
      data: { payrollRunId: runId, userId, baseSalary, bonuses, deductions, taxAmount, netPay, notes: notes ?? null },
    });

    // Recalculate run totals
    const allEntries = await (prisma as any).payrollEntry.findMany({ where: { payrollRunId: runId } });
    const totalGross = allEntries.reduce((s: number, e: any) => s + Number(e.baseSalary) + Number(e.bonuses), 0);
    const totalDeductions = allEntries.reduce((s: number, e: any) => s + Number(e.deductions) + Number(e.taxAmount), 0);
    await (prisma as any).payrollRun.update({
      where: { id: runId },
      data: { totalGross, totalDeductions, totalNet: totalGross - totalDeductions },
    });

    return created({ ...entry, baseSalary: Number(entry.baseSalary), bonuses: Number(entry.bonuses), deductions: Number(entry.deductions), taxAmount: Number(entry.taxAmount), netPay: Number(entry.netPay) });
  },
);
