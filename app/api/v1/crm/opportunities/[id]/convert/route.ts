import { withAuth } from '@/src/core/api/handler';
import { created } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';

export interface ConvertResult {
  customerId: number;
  orderId: number;
  orderNumber: string;
}

/**
 * Converts a "won" CRM opportunity into a Sales customer + draft Sales order.
 *
 * - Find-or-create a Sales customer matched by (tenantId + name). The name is
 *   derived from the company name, else the contact name, else the opportunity title.
 * - Create a draft sales order with a single line item for the opportunity, using
 *   the same `SO-####` order-number scheme as the sales orders POST route.
 *
 * Uses `(prisma as any)` for the crm/sales models (generated client lacks types here).
 */
export async function convertOpportunity(
  opportunity: any,
  userId: number,
): Promise<ConvertResult> {
  const tenantId = opportunity.tenantId;

  // Load related company (for the customer name) and contact (for email/phone).
  const [company, contact] = await Promise.all([
    opportunity.companyId
      ? (prisma as any).crmCompany.findFirst({
          where: { id: opportunity.companyId, tenantId },
        })
      : Promise.resolve(null),
    opportunity.contactId
      ? (prisma as any).crmContact.findFirst({
          where: { id: opportunity.contactId, tenantId },
        })
      : Promise.resolve(null),
  ]);

  const contactName = contact
    ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
    : '';
  const customerName =
    company?.name || (contactName || undefined) || opportunity.title;

  const email = contact?.email ?? null;
  const phone = contact?.phone ?? company?.phone ?? null;

  // Find-or-create the Sales customer by (tenantId + name).
  let customer = await (prisma as any).customer.findFirst({
    where: { tenantId, name: customerName },
  });

  if (!customer) {
    customer = await (prisma as any).customer.create({
      data: {
        tenantId,
        name: customerName,
        email,
        phone,
        createdBy: userId,
      },
    });
  }

  // Generate the order number the same way the sales orders POST route does.
  const count = await (prisma as any).salesOrder.count({ where: { tenantId } });
  const orderNumber = `SO-${String(count + 1).padStart(4, '0')}`;

  const value = Number(opportunity.value) || 0;

  const order = await (prisma as any).salesOrder.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber,
      status: 'draft',
      totalAmount: value,
      createdBy: userId,
      items: {
        create: [
          {
            description: opportunity.title,
            quantity: 1,
            unitPrice: value,
            totalPrice: value,
          },
        ],
      },
    },
  });

  return { customerId: customer.id, orderId: order.id, orderNumber };
}

export const POST = withAuth(
  { moduleId: 'crm', permissions: ['crm.opportunity.manage'] },
  async (_request, ctx) => {
    const id = parseInt(ctx.params.id);
    const tenantId = ctx.session.tenantId;

    const opportunity = await (prisma as any).crmOpportunity.findFirst({
      where: { id, tenantId },
    });

    if (!opportunity) {
      return apiError('NOT_FOUND', 'Opportunity not found', 404);
    }

    const result = await convertOpportunity(opportunity, ctx.session.userId);

    return created(result);
  },
);
