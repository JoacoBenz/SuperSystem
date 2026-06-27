import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const createOpportunitySchema = z.object({
  title: z.string().min(1).max(255),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('lead'),
  companyId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  value: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  probability: z.number().int().min(0).max(100).default(10),
  expectedCloseDate: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.opportunity.read'] },
  async (_request, ctx) => {
    const { query } = ctx;
    const tenantId = ctx.session.tenantId;
    const page = parseInt(query.get('page') ?? '1');
    const limit = parseInt(query.get('limit') ?? '20');
    const stage = query.get('stage') ?? undefined;
    const companyId = query.get('companyId') ? parseInt(query.get('companyId')!) : undefined;

    const where: Record<string, unknown> = { tenantId };
    if (stage) where.stage = stage;
    if (companyId) where.companyId = companyId;

    const [data, total] = await Promise.all([
      (prisma as any).crmOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      (prisma as any).crmOpportunity.count({ where }),
    ]);

    return paginated(
      data.map((o: any) => ({
        ...o,
        value: o.value ? Number(o.value) : null,
      })),
      total,
      page,
      limit,
    );
  },
);

export const POST = withAuth(
  { moduleId: 'crm', permissions: ['crm.opportunity.manage'], body: createOpportunitySchema },
  async (_request, ctx) => {
    const {
      title,
      stage,
      companyId,
      contactId,
      value,
      currency,
      probability,
      expectedCloseDate,
      notes,
    } = ctx.body;

    const opportunity = await (prisma as any).crmOpportunity.create({
      data: {
        tenantId: ctx.session.tenantId,
        title,
        stage,
        companyId: companyId ?? null,
        contactId: contactId ?? null,
        value: value ?? null,
        currency,
        probability,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        notes: notes ?? null,
        createdBy: ctx.session.userId,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return created({
      ...opportunity,
      value: opportunity.value ? Number(opportunity.value) : null,
    });
  },
);
