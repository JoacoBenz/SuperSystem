import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { recordTreasuryMovement, recordJournalEntry } from '@/src/core/integration/postings';
import { NotificationService } from '@/src/core/notifications/notification.service';
import { z } from 'zod';

const updateRunSchema = z.object({
  status: z.enum(['draft', 'processing', 'approved', 'paid']).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'payroll', permissions: ['payroll.run.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const run = await (prisma as any).payrollRun.findFirst({
      where: { id, tenantId: ctx.session.tenantId },
      include: {
        entries: true,
      },
    });
    if (!run) throw new ApiError('NOT_FOUND', 'Payroll run not found', 404);

    const userIds: number[] = run.entries.map((e: any) => e.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, departmentId: true, department: { select: { name: true } } },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return ok({
      ...run,
      totalGross: Number(run.totalGross),
      totalDeductions: Number(run.totalDeductions),
      totalNet: Number(run.totalNet),
      entries: run.entries.map((e: any) => ({
        ...e,
        baseSalary: Number(e.baseSalary),
        bonuses: Number(e.bonuses),
        deductions: Number(e.deductions),
        taxAmount: Number(e.taxAmount),
        netPay: Number(e.netPay),
        user: userMap.get(e.userId) ?? null,
      })),
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'payroll', permissions: ['payroll.run.manage'], body: updateRunSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    const tenantId = ctx.session.tenantId;

    const run = await (prisma as any).payrollRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new ApiError('NOT_FOUND', 'Payroll run not found', 404);

    const wasPaid = run.status === 'paid';

    const updateData: Record<string, unknown> = {};
    if (ctx.body.notes !== undefined) updateData.notes = ctx.body.notes;
    if (ctx.body.status) {
      updateData.status = ctx.body.status;
      if (ctx.body.status === 'approved') {
        updateData.approvedBy = ctx.session.userId;
        updateData.approvedAt = new Date();
      }
      if (ctx.body.status === 'paid') {
        updateData.paidAt = new Date();
      }
    }

    const updated = await (prisma as any).payrollRun.update({
      where: { id },
      data: updateData,
    });

    // When a run transitions into `paid`, ripple into Treasury, Accounting and notifications.
    if (!wasPaid && updated.status === 'paid') {
      const userId = ctx.session.userId;
      const net = Number(updated.totalNet);
      const ref = updated.period ? `PR-RUN-${updated.period}` : `PR-RUN-${id}`;

      // 1. Treasury: cash out of the primary bank account.
      try {
        await recordTreasuryMovement(tenantId, userId, {
          type: 'debit',
          amount: net,
          description: 'Payroll run paid',
          reference: ref,
        });
      } catch {
        // best-effort: never fail the transition because Treasury isn't set up
      }

      // 2. Accounting: Dr Operating Expenses / Cr Cash.
      try {
        await recordJournalEntry(tenantId, userId, `Payroll ${ref}`, [
          { code: '5000', debit: net, memo: 'Salaries expense' },
          { code: '1000', credit: net, memo: 'Cash out' },
        ]);
      } catch {
        // best-effort: never fail the transition because Accounting isn't set up
      }

      // 3. Notify each paid employee.
      try {
        const entries = await (prisma as any).payrollEntry.findMany({
          where: { payrollRunId: id },
          select: { userId: true },
        });
        const notifications = new NotificationService(tenantId);
        for (const entry of entries) {
          await notifications.notifyUser(
            entry.userId,
            'payroll_paid',
            'Salary paid',
            'Your salary for this run has been paid',
            'payroll_run',
            id,
            'payroll',
          );
        }
      } catch {
        // best-effort: notifications must not fail the transition
      }

      // 4. Audit the posting.
      try {
        await ctx.audit.log({
          action: 'create',
          resource: 'posting',
          moduleId: 'payroll',
          eventType: 'workflow',
          newData: { via: 'payroll_paid', amount: net, runId: id },
        });
      } catch {
        // best-effort
      }
    }

    return ok({ ...updated, totalGross: Number(updated.totalGross), totalDeductions: Number(updated.totalDeductions), totalNet: Number(updated.totalNet) });
  },
);
