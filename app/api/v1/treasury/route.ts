import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().max(100).optional(),
  accountType: z.string().max(50).optional(),
  currency: z.string().max(3).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.bank_account.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;
    const type = query.get('type') ?? undefined;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) {
      where.accountType = type;
    }

    const [data, total] = await Promise.all([
      (prisma as any).bankAccount.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { transactions: true } },
        },
      }),
      (prisma as any).bankAccount.count({ where }),
    ]);

    return paginated(
      data.map((a: any) => ({
        ...a,
        balance: Number(a.balance),
        transactionCount: a._count.transactions,
        _count: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'treasury', permissions: ['treasury.bank_account.manage'], body: createAccountSchema },
  async (_request, ctx) => {
    const { name, bankName, accountNumber, accountType, currency, notes } = ctx.body;
    const account = await (prisma as any).bankAccount.create({
      data: {
        tenantId: ctx.session.tenantId,
        name,
        bankName,
        accountNumber: accountNumber ?? null,
        accountType: accountType ?? 'checking',
        currency: currency ?? 'USD',
        notes: notes ?? null,
        createdBy: ctx.session.userId,
      },
    });
    return created({ ...account, balance: Number(account.balance) });
  },
);
