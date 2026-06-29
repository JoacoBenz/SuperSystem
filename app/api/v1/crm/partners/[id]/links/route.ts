import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

const p = prisma as any;
const MODEL = { customer: 'customer', vendor: 'vendor', company: 'crmCompany' } as const;

const linkSchema = z.object({
  kind: z.enum(['customer', 'vendor', 'company']),
  recordId: z.number().int().positive(),
  unlink: z.boolean().optional(),
});

// Link (or unlink) a sales customer / procurement vendor / CRM company to this partner
// by setting its business_partner_id. Non-destructive — the underlying record is untouched.
export const POST = withAuth(
  { moduleId: 'crm', permissions: ['crm.partner.manage'], body: linkSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id as string);
    if (Number.isNaN(id)) throw new ApiError('NOT_FOUND', 'Partner not found', 404);
    const tenantId = ctx.session.tenantId;
    const { kind, recordId, unlink } = ctx.body;

    const partner = await p.businessPartner.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!partner) throw new ApiError('NOT_FOUND', 'Partner not found', 404);

    const model = MODEL[kind as keyof typeof MODEL];
    const res = await p[model].updateMany({ where: { id: recordId, tenantId }, data: { businessPartnerId: unlink ? null : id } });
    if (res.count === 0) throw new ApiError('NOT_FOUND', `${kind} ${recordId} not found in tenant`, 404);

    await ctx.audit.log({ action: 'update', resource: 'business_partner', resourceId: id, moduleId: 'crm', eventType: 'data_change', newData: { [unlink ? 'unlinked' : 'linked']: { kind, recordId } } });
    return ok({ linked: !unlink, kind, recordId });
  },
);
