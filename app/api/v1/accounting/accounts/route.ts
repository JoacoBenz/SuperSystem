import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).default('asset'),
  description: z.string().optional(),
  parentId: z.number().int().positive().optional(),
});

export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.account.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;
    const type = query.get('type') ?? undefined;

    const where: Record<string, unknown> = { tenantId };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      (prisma as any).chartOfAccount.findMany({
        where,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { children: true } },
        },
      }),
      (prisma as any).chartOfAccount.count({ where }),
    ]);

    return paginated(
      data.map((a: any) => ({
        ...a,
        childCount: a._count.children,
        _count: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.account.manage'], body: createAccountSchema },
  async (_request, ctx) => {
    const { code, name, type, description, parentId } = ctx.body;
    const account = await (prisma as any).chartOfAccount.create({
      data: {
        tenantId: ctx.session.tenantId,
        code,
        name,
        type,
        description: description ?? null,
        parentId: parentId ?? null,
        createdBy: ctx.session.userId,
      },
    });
    return created(account);
  },
);
