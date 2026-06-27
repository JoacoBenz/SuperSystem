import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';
import { apiError } from '@/src/core/api/errors';
import { convertOpportunity } from './convert/route';

const VALID_TRANSITIONS: Record<string, string[]> = {
  lead: ['qualified', 'lost'],
  qualified: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
};

const updateStageSchema = z.object({
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
});

export const GET = withAuth(
  { moduleId: 'crm', permissions: ['crm.opportunity.read'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    const tenantId = ctx.session.tenantId;

    const opportunity = await (prisma as any).crmOpportunity.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true, industry: true, website: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!opportunity) {
      return apiError('NOT_FOUND', 'Opportunity not found', 404);
    }

    return ok({
      ...opportunity,
      value: opportunity.value ? Number(opportunity.value) : null,
    });
  },
);

export const PATCH = withAuth(
  { moduleId: 'crm', permissions: ['crm.opportunity.manage'], body: updateStageSchema },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    const tenantId = ctx.session.tenantId;
    const { stage: newStage } = ctx.body;

    const opportunity = await (prisma as any).crmOpportunity.findFirst({
      where: { id, tenantId },
    });

    if (!opportunity) {
      return apiError('NOT_FOUND', 'Opportunity not found', 404);
    }

    const allowedNext = VALID_TRANSITIONS[opportunity.stage] ?? [];
    if (!allowedNext.includes(newStage)) {
      return apiError(
        'BAD_REQUEST',
        `Cannot transition from "${opportunity.stage}" to "${newStage}". Allowed: ${allowedNext.join(', ') || 'none'}`,
        400,
      );
    }

    const updated = await (prisma as any).crmOpportunity.update({
      where: { id },
      data: { stage: newStage },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Auto-hook: when an opportunity transitions to "won", spin up a Sales
    // customer + draft order. Best-effort and non-fatal — the stage transition
    // is already committed and must not be rolled back on conversion failure.
    if (newStage === 'won' && opportunity.stage !== 'won') {
      try {
        const result = await convertOpportunity(updated, ctx.session.userId);
        await ctx.audit.log({
          action: 'create',
          resource: 'posting',
          moduleId: 'crm',
          eventType: 'workflow',
          newData: {
            via: 'opportunity_won',
            opportunityId: id,
            customerId: result.customerId,
            orderId: result.orderId,
            orderNumber: result.orderNumber,
          },
        });
      } catch {
        // non-fatal: conversion failure must not break the stage transition
      }
    }

    return ok({
      ...updated,
      value: updated.value ? Number(updated.value) : null,
    });
  },
);
