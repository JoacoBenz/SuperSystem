import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';
import { decryptField } from '@/src/core/crypto/field-encryption';
import { z } from 'zod';

const updateAccountSchema = z.object({
  balance: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.bank_account.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    if (Number.isNaN(id)) return apiError('NOT_FOUND', 'Bank account not found', 404);
    const tenantId = ctx.session.tenantId;

    const account = await (prisma as any).bankAccount.findFirst({
      where: { id, tenantId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!account) {
      return apiError('NOT_FOUND', 'Bank account not found', 404);
    }

    return ok({
      ...account,
      accountNumber: decryptField(account.accountNumber),
      balance: Number(account.balance),
      transactions: account.transactions.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
      })),
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.bank_account.manage'], body: updateAccountSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    if (Number.isNaN(id)) return apiError('NOT_FOUND', 'Bank account not found', 404);
    const tenantId = ctx.session.tenantId;

    const account = await (prisma as any).bankAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      return apiError('NOT_FOUND', 'Bank account not found', 404);
    }

    const { balance, notes, isActive } = ctx.body;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (balance !== undefined) data.balance = balance;
    if (notes !== undefined) data.notes = notes;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await (prisma as any).bankAccount.update({
      where: { id },
      data,
    });

    return ok({ ...updated, accountNumber: decryptField(updated.accountNumber), balance: Number(updated.balance) });
  },
);
