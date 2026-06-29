import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { serializeProduct } from '../route';
import { z } from 'zod';

const p = prisma as any;

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  unitOfMeasure: z.string().max(50).optional(),
  minStock: z.number().min(0).optional().nullable(),
  maxStock: z.number().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  active: z.boolean().optional(),
});

async function load(ctx: any) {
  const id = parseInt(ctx.params.id as string);
  if (Number.isNaN(id)) throw new ApiError('NOT_FOUND', 'Product not found', 404);
  const product = await p.product.findFirst({ where: { id, tenantId: ctx.session.tenantId, deletedAt: null } });
  if (!product) throw new ApiError('NOT_FOUND', 'Product not found', 404);
  return { id, product };
}

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.read'] },
  async (_request, ctx) => {
    const { product } = await load(ctx);
    return ok(serializeProduct(product));
  },
);

export const PATCH = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.manage'], body: updateSchema },
  async (_request, ctx) => {
    const { id } = await load(ctx);
    const b = ctx.body as Record<string, unknown>;
    const data: Record<string, unknown> = { updatedBy: ctx.session.userId, version: { increment: 1 } };
    for (const k of ['name', 'description', 'categoryId', 'unitOfMeasure', 'minStock', 'maxStock', 'costPrice', 'salePrice', 'active']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    const product = await p.product.update({ where: { id }, data });
    return ok(serializeProduct(product));
  },
);

export const DELETE = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.manage'] },
  async (_request, ctx) => {
    const { id } = await load(ctx);
    await p.product.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    return ok({ message: 'Product retired' });
  },
);
