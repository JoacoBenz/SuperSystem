import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().max(100).optional(),
  website: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.company.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      (prisma as any).crmCompany.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { contacts: true, opportunities: true } },
        },
      }),
      (prisma as any).crmCompany.count({ where }),
    ]);

    return paginated(
      data.map((c: any) => ({
        ...c,
        contactCount: c._count.contacts,
        opportunityCount: c._count.opportunities,
        _count: undefined,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'crm', permissions: ['crm.company.manage'], body: createCompanySchema },
  async (_request, ctx) => {
    const { name, industry, website, phone, address, notes } = ctx.body;
    const company = await (prisma as any).crmCompany.create({
      data: {
        tenantId: ctx.session.tenantId,
        name,
        industry: industry ?? null,
        website: website ?? null,
        phone: phone ?? null,
        address: address ?? null,
        notes: notes ?? null,
        createdBy: ctx.session.userId,
      },
    });
    return created(company);
  },
);
