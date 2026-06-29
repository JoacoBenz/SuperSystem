import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const p = prisma as any;

const createSchema = z.object({
  name: z.string().min(1).max(255),
  taxId: z.string().max(100).optional(),
  roles: z.enum(['customer', 'vendor', 'both']).default('both'),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.partner.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '50');
    const search = query.get('search') ?? undefined;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { taxId: { contains: search, mode: 'insensitive' } }];

    const [data, total] = await Promise.all([
      p.businessPartner.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { contacts: true } } } }),
      p.businessPartner.count({ where }),
    ]);
    return paginated(data.map((x: any) => ({ ...x, contactCount: x._count.contacts })), total, page, pageSize);
  },
);

export const POST = withAuth(
  { moduleId: 'crm', permissions: ['crm.partner.manage'], body: createSchema },
  async (_request, ctx) => {
    const b = ctx.body;
    const partner = await p.businessPartner.create({
      data: {
        tenantId: ctx.session.tenantId,
        name: b.name, taxId: b.taxId ?? null, roles: b.roles,
        email: b.email ?? null, phone: b.phone ?? null, address: b.address ?? null, notes: b.notes ?? null,
        createdBy: ctx.session.userId,
      },
    });
    await ctx.audit.log({ action: 'create', resource: 'business_partner', resourceId: partner.id, moduleId: 'crm', eventType: 'data_change', newData: { name: b.name } });
    return created(partner);
  },
);
