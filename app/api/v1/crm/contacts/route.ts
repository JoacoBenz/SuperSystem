import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyId: z.number().int().positive().optional(),
  title: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.contact.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;
    const companyId = query.get('companyId') ? parseInt(query.get('companyId')!) : undefined;

    const where: Record<string, unknown> = { tenantId };
    if (companyId) where.companyId = companyId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      (prisma as any).crmContact.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
        },
      }),
      (prisma as any).crmContact.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  },
);

export const POST = withAuth(
  { moduleId: 'crm', permissions: ['crm.contact.manage'], body: createContactSchema },
  async (_request, ctx) => {
    const { firstName, lastName, companyId, title, email, phone, notes } = ctx.body;
    const contact = await (prisma as any).crmContact.create({
      data: {
        tenantId: ctx.session.tenantId,
        firstName,
        lastName,
        companyId: companyId ?? null,
        title: title ?? null,
        email: email ?? null,
        phone: phone ?? null,
        notes: notes ?? null,
        createdBy: ctx.session.userId,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });
    return created(contact);
  },
);
