import { withAuth } from '@/src/core/api/handler';
import { ok, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM'),
  name: z.string().min(1).max(255),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
  entries: z.array(z.object({
    userId: z.number().int().positive(),
    baseSalary: z.number().positive(),
    bonuses: z.number().min(0).default(0),
    deductions: z.number().min(0).default(0),
    taxAmount: z.number().min(0).default(0),
    notes: z.string().optional(),
  })).optional(),
});

export const GET = withAuth(
  { moduleId: 'payroll', permissions: ['payroll.run.read'] },
  async (_request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const runs = await (prisma as any).payrollRun.findMany({
      where: { tenantId },
      orderBy: { period: 'desc' },
      include: {
        _count: { select: { entries: true } },
      },
    });
    return ok(runs.map((r: any) => ({
      ...r,
      totalGross: Number(r.totalGross),
      totalDeductions: Number(r.totalDeductions),
      totalNet: Number(r.totalNet),
      employeeCount: r._count.entries,
    })));
  },
);

export const POST = withAuth(
  { moduleId: 'payroll', permissions: ['payroll.run.manage'], body: createRunSchema },
  async (_request, ctx) => {
    const { period, name, currency, notes, entries = [] } = ctx.body;
    const tenantId = ctx.session.tenantId;

    const existing = await (prisma as any).payrollRun.findUnique({
      where: { tenantId_period: { tenantId, period } },
    });
    if (existing) {
      throw new ApiError('CONFLICT', `A payroll run for ${period} already exists`, 409);
    }

    const totalGross = entries.reduce((s: number, e: any) => s + e.baseSalary + (e.bonuses ?? 0), 0);
    const totalDeductions = entries.reduce((s: number, e: any) => s + (e.deductions ?? 0) + (e.taxAmount ?? 0), 0);
    const totalNet = totalGross - totalDeductions;

    const run = await (prisma as any).payrollRun.create({
      data: {
        tenantId,
        period,
        name,
        currency,
        notes: notes ?? null,
        totalGross,
        totalDeductions,
        totalNet,
        createdBy: ctx.session.userId,
        entries: entries.length > 0 ? {
          create: entries.map((e: any) => ({
            userId: e.userId,
            baseSalary: e.baseSalary,
            bonuses: e.bonuses ?? 0,
            deductions: e.deductions ?? 0,
            taxAmount: e.taxAmount ?? 0,
            netPay: e.baseSalary + (e.bonuses ?? 0) - (e.deductions ?? 0) - (e.taxAmount ?? 0),
            notes: e.notes ?? null,
          })),
        } : undefined,
      },
      include: { _count: { select: { entries: true } } },
    });

    return created({
      ...run,
      totalGross: Number(run.totalGross),
      totalDeductions: Number(run.totalDeductions),
      totalNet: Number(run.totalNet),
      employeeCount: run._count.entries,
    });
  },
);
