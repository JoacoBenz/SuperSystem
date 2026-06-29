import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const p = prisma as any;

const createSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional().nullable(),
  unitOfMeasure: z.string().max(50).default('units'),
  minStock: z.number().min(0).optional().nullable(),
  maxStock: z.number().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
});

export function serializeProduct(o: any) {
  return {
    ...o,
    minStock: o.minStock != null ? Number(o.minStock) : null,
    maxStock: o.maxStock != null ? Number(o.maxStock) : null,
    costPrice: o.costPrice != null ? Number(o.costPrice) : null,
    salePrice: o.salePrice != null ? Number(o.salePrice) : null,
  };
}

export const GET = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '50');
    const search = query.get('search') ?? undefined;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];

    const [data, total] = await Promise.all([
      p.product.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      p.product.count({ where }),
    ]);
    return paginated(data.map(serializeProduct), total, page, pageSize);
  },
);

export const POST = withAuth(
  { moduleId: 'inventory', permissions: ['inventory.product.manage'], body: createSchema },
  async (_request, ctx) => {
    const b = ctx.body;
    const tenantId = ctx.session.tenantId;

    const dup = await p.product.findFirst({ where: { tenantId, sku: b.sku, deletedAt: null } });
    if (dup) throw new ApiError('CONFLICT', `SKU ${b.sku} already exists`, 409);

    const product = await p.product.create({
      data: {
        tenantId,
        sku: b.sku,
        name: b.name,
        description: b.description ?? null,
        categoryId: b.categoryId ?? null,
        unitOfMeasure: b.unitOfMeasure,
        minStock: b.minStock ?? null,
        maxStock: b.maxStock ?? null,
        costPrice: b.costPrice ?? null,
        salePrice: b.salePrice ?? null,
        createdBy: ctx.session.userId,
      },
    });
    await ctx.audit.log({ action: 'create', resource: 'product', resourceId: product.id, moduleId: 'inventory', eventType: 'data_change', newData: { sku: b.sku, name: b.name } });
    return created(serializeProduct(product));
  },
);
