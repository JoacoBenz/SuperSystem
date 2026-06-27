import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';
import { transactionDelta } from '@/src/modules/treasury/balance';
import { z } from 'zod';

const createTransactionSchema = z.object({
  bankAccountId: z.number().int().positive(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(['credit', 'debit']),
  reference: z.string().max(255).optional(),
});

export const GET = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.transaction.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const accountId = query.get('accountId') ? parseInt(query.get('accountId')!) : undefined;
    const type = query.get('type') ?? undefined;
    const reconciled = query.get('reconciled');

    const where: Record<string, unknown> = { tenantId };
    if (accountId) where.bankAccountId = accountId;
    if (type) where.type = type;
    if (reconciled !== null && reconciled !== undefined) {
      where.reconciled = reconciled === 'true';
    }

    const [data, total] = await Promise.all([
      (prisma as any).bankTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bankAccount: { select: { id: true, name: true } },
        },
      }),
      (prisma as any).bankTransaction.count({ where }),
    ]);

    return paginated(
      data.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        accountName: t.bankAccount?.name ?? null,
        bankAccount: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.transaction.manage'], body: createTransactionSchema },
  async (_request, ctx) => {
    const { bankAccountId, description, amount, type, reference } = ctx.body;
    const tenantId = ctx.session.tenantId;

    const account = await (prisma as any).bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    });

    if (!account) {
      return apiError('NOT_FOUND', 'Bank account not found', 404);
    }

    const transaction = await (prisma as any).bankTransaction.create({
      data: {
        bankAccountId,
        tenantId,
        description,
        amount,
        type,
        reference: reference ?? null,
        createdBy: ctx.session.userId,
      },
    });

    const balanceDelta = transactionDelta(amount, type);
    await (prisma as any).bankAccount.update({
      where: { id: bankAccountId },
      data: {
        balance: { increment: balanceDelta },
        updatedAt: new Date(),
      },
    });

    return created({ ...transaction, amount: Number(transaction.amount) });
  },
);
