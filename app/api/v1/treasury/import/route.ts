import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { apiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { transactionDelta } from '@/src/modules/treasury/balance';
import { parseStatementCsv, classifyStatement } from '@/src/core/providers/bankfeed/csv';
import { z } from 'zod';

const p = prisma as any;

const importSchema = z.object({
  bankAccountId: z.number().int().positive(),
  csv: z.string().min(1),
});

/**
 * Import a bank statement (CSV) into an account: post new lines (adjusting the balance)
 * and auto-reconcile lines whose reference matches an existing un-reconciled transaction.
 * Idempotent — a reference already present + reconciled is skipped as a duplicate.
 */
export const POST = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.transaction.manage'], body: importSchema },
  async (_request, ctx) => {
    const { bankAccountId, csv } = ctx.body;
    const tenantId = ctx.session.tenantId;

    const account = await p.bankAccount.findFirst({ where: { id: bankAccountId, tenantId } });
    if (!account) return apiError('NOT_FOUND', 'Bank account not found', 404);

    const rows = parseStatementCsv(csv);
    const refs = rows.map(r => r.reference).filter(Boolean);
    const existingRows = refs.length
      ? await p.bankTransaction.findMany({ where: { tenantId, bankAccountId, reference: { in: refs } }, select: { id: true, reference: true, reconciled: true } })
      : [];
    const existing = new Map<string, { id: number; reconciled: boolean }>(existingRows.map((t: any) => [t.reference, { id: t.id, reconciled: t.reconciled }]));

    const { toReconcile, toCreate, duplicates } = classifyStatement(rows, existing);

    for (const r of toReconcile) {
      const ex = existing.get(r.reference);
      if (ex) await p.bankTransaction.update({ where: { id: ex.id }, data: { reconciled: true } });
    }

    let created = 0;
    let balanceDelta = 0;
    for (const r of toCreate) {
      const amt = Math.abs(r.amount);
      if (amt === 0) continue;
      const type = r.amount >= 0 ? 'credit' : 'debit';
      await p.bankTransaction.create({
        data: { bankAccountId, tenantId, description: r.description || 'Imported statement line', amount: amt, type, reference: r.reference || null, reconciled: true, createdBy: ctx.session.userId },
      });
      balanceDelta += transactionDelta(amt, type);
      created++;
    }
    if (balanceDelta !== 0) {
      await p.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { increment: balanceDelta }, updatedAt: new Date() } });
    }

    await ctx.audit.log({ action: 'create', resource: 'bank_statement_import', moduleId: 'treasury', eventType: 'workflow', newData: { bankAccountId, parsed: rows.length, imported: created, reconciled: toReconcile.length, duplicates: duplicates.length } });
    return ok({ parsed: rows.length, imported: created, reconciled: toReconcile.length, duplicates: duplicates.length });
  },
);
