import { withAuth } from '@/src/core/api/handler';
import { ok, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createAdjustmentSchema = z.object({
  description: z.string().min(1).max(255),
  quantity: z.number().refine(n => n !== 0, 'Quantity must be non-zero'),
  unit: z.string().max(50).default('units'),
  reason: z.string().min(1).max(500),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'inventory', permissionsAny: ['inventory.stock_adjustment.read'] },
  async (request, ctx) => {
    const tenantId = ctx.session.tenantId;
    const page = parseInt(ctx.query.get('page') ?? '1');
    const limit = parseInt(ctx.query.get('limit') ?? '20');
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.stockAdjustment.count({ where: { tenantId } }),
      prisma.stockAdjustment.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return ok({ data: rows.map(r => ({ ...r, quantity: Number(r.quantity) })), total, page, totalPages: Math.ceil(total / limit) });
  },
);

export const POST = withAuth(
  { moduleId: 'inventory', permissionsAny: ['inventory.stock_adjustment.create'], body: createAdjustmentSchema },
  async (request, ctx) => {
    const { body, session } = ctx;

    const adj = await prisma.stockAdjustment.create({
      data: {
        tenantId: session.tenantId,
        description: body.description,
        quantity: body.quantity,
        unit: body.unit,
        reason: body.reason,
        notes: body.notes ?? null,
        createdBy: session.userId,
      } as any,
    });

    return created({ ...adj, quantity: Number(adj.quantity) });
  },
);
