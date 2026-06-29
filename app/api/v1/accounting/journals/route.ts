import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { apiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { nextDocumentNumber } from '@/src/core/integration/numbering';
import { z } from 'zod';

const journalLineSchema = z.object({
  accountId: z.number().int().positive(),
  description: z.string().max(500).optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
});

const createJournalSchema = z.object({
  description: z.string().min(1).max(500),
  date: z.string().optional(),
  lines: z.array(journalLineSchema).optional().default([]),
});

export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.journal.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const status = query.get('status') ?? undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      (prisma as any).journalEntry.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { lines: true } },
        },
      }),
      (prisma as any).journalEntry.count({ where }),
    ]);

    return paginated(
      data.map((e: any) => ({
        ...e,
        lineCount: e._count.lines,
        _count: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.journal.manage'], body: createJournalSchema },
  async (_request, ctx) => {
    const { description, date, lines } = ctx.body;
    const tenantId = ctx.session.tenantId;

    // Enforce double-entry: when lines are supplied, debits must equal credits.
    const totalDebit = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
    if (lines.length > 0 && Math.abs(totalDebit - totalCredit) > 0.001) {
      return apiError('VALIDATION_ERROR', `Journal entry must balance: debits (${totalDebit}) ≠ credits (${totalCredit})`, 422);
    }

    const entryNumber = await nextDocumentNumber(prisma as any, tenantId, 'JE', {
      prefix: 'JE-', pad: 5, seed: () => (prisma as any).journalEntry.count({ where: { tenantId } }),
    });

    const journalEntry = await (prisma as any).journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        description,
        date: date ? new Date(date) : new Date(),
        status: 'draft',
        createdBy: ctx.session.userId,
      },
    });

    for (const line of lines) {
      await (prisma as any).journalLine.create({
        data: {
          journalEntryId: journalEntry.id,
          tenantId,
          accountId: line.accountId,
          description: line.description ?? null,
          debit: line.debit,
          credit: line.credit,
        },
      });
    }

    return created(journalEntry);
  },
);
