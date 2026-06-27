import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { canTransitionJournal } from '@/src/modules/accounting/journal-state';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const patchStatusSchema = z.object({
  status: z.enum(['posted', 'void']),
});

export const GET = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.journal.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    const tenantId = ctx.session.tenantId;

    const entry = await (prisma as any).journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: { message: 'Journal entry not found' } }, { status: 404 });
    }

    return ok(entry);
  },
);

export const PATCH = withAuth(
  { moduleId: 'accounting', permissions: ['accounting.journal.post'], body: patchStatusSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    const tenantId = ctx.session.tenantId;
    const { status: newStatus } = ctx.body;

    const entry = await (prisma as any).journalEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      return NextResponse.json({ error: { message: 'Journal entry not found' } }, { status: 404 });
    }

    if (!canTransitionJournal(entry.status, newStatus)) {
      return NextResponse.json(
        { error: { message: `Cannot transition from ${entry.status} to ${newStatus}` } },
        { status: 422 },
      );
    }

    const updated = await (prisma as any).journalEntry.update({
      where: { id },
      data: { status: newStatus, updatedAt: new Date() },
    });

    return ok(updated);
  },
);
