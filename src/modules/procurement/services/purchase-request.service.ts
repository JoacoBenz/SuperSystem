import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { SessionUser } from '@/src/shared/types/common';
import type { CreatePurchaseRequestInput, UpdatePurchaseRequestInput } from '../validators/purchase-request.schema';
import { purchaseRequestWorkflow } from '../workflows/purchase-request.workflow';
import { ApiError } from '@/src/core/api/errors';
import { TransitionError, GuardError } from '@/src/core/state-machine/errors';
import { cached } from '@/src/core/cache';
import type { PurchaseRequestWorkflowContext } from '../types';
import { NotificationService } from '@/src/core/notifications/notification.service';

export class PurchaseRequestService {
  constructor(
    private db: TenantDB,
    private session: SessionUser,
    private audit: AuditService,
  ) {}

  async list(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    urgency?: string;
    departmentId?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    const { page = 1, pageSize = 20, status, urgency, departmentId, search, sort = 'createdAt', order = 'desc' } = params;
    const where: Record<string, unknown> = { deletedAt: null };

    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Scope by permissions
    const perms = new Set(this.session.permissions);
    if (!perms.has('procurement.purchase_request.read_all')) {
      if (perms.has('procurement.purchase_request.read_department') && this.session.departmentId) {
        where.departmentId = this.session.departmentId;
      } else {
        where.requesterId = this.session.userId;
      }
    }

    const [data, total] = await Promise.all([
      this.db.purchaseRequest.findMany({
        where: where as any,
        include: {
          vendor: { select: { id: true, name: true } },
          costCenter: { select: { id: true, name: true, code: true } },
          items: true,
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.purchaseRequest.count({ where: where as any }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: number) {
    const pr = await this.db.purchaseRequest.findUnique({
      where: { id },
      include: {
        vendor: true,
        costCenter: true,
        items: { include: { receptionItems: true } },
        orders: true,
        receptions: { include: { items: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!pr || pr.deletedAt) {
      throw new ApiError('NOT_FOUND', 'Purchase request not found', 404);
    }
    return pr;
  }

  async create(input: CreatePurchaseRequestInput) {
    const estimatedTotal = input.items.reduce((sum, item) => {
      return sum + (item.estimatedPrice ? item.estimatedPrice * item.quantity : 0);
    }, 0);

    // Generate number
    const count = await this.db.purchaseRequest.count();
    const number = `PR-${String(count + 1).padStart(5, '0')}`;

    const status = input.action === 'submit' ? 'submitted' : 'draft';

    const pr = await this.db.purchaseRequest.create({
      data: {
        number,
        title: input.title,
        description: input.description,
        justification: input.justification,
        urgency: input.urgency,
        estimatedTotal: estimatedTotal > 0 ? Number(estimatedTotal) : null,
        status,
        requesterId: this.session.userId,
        departmentId: this.session.departmentId!,
        vendorId: input.vendorId ?? null,
        costCenterId: input.costCenterId ?? null,
        submittedAt: status === 'submitted' ? new Date() : null,
        createdBy: this.session.userId,
        updatedBy: this.session.userId,
        items: {
          create: input.items.map(item => ({
            tenantId: this.session.tenantId,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
            productUrl: item.productUrl ?? null,
            productId: item.productId ?? null,
          })),
        },
      } as any,
      include: { items: true },
    });

    await this.audit.log({
      action: 'create',
      resource: 'purchase_request',
      resourceId: pr.id,
      moduleId: 'procurement',
      newData: { number: pr.number, title: pr.title, status: pr.status },
    });

    return pr;
  }

  async update(id: number, input: UpdatePurchaseRequestInput) {
    const existing = await this.getById(id);

    if (!purchaseRequestWorkflow.isEditable(existing.status)) {
      throw new ApiError('FORBIDDEN', 'Purchase request cannot be edited in its current state', 403);
    }

    if (existing.requesterId !== this.session.userId) {
      throw new ApiError('FORBIDDEN', 'Only the requester can edit this purchase request', 403);
    }

    // Optimistic locking
    if (input.version !== undefined && input.version !== existing.version) {
      throw new ApiError('CONFLICT', 'This record has been modified by another user', 409);
    }

    const updateData: Record<string, unknown> = {
      version: { increment: 1 },
      updatedBy: this.session.userId,
    };

    if (input.title) updateData.title = input.title;
    if (input.description) updateData.description = input.description;
    if (input.justification) updateData.justification = input.justification;
    if (input.urgency) updateData.urgency = input.urgency;
    if (input.vendorId !== undefined) updateData.vendorId = input.vendorId;
    if (input.costCenterId !== undefined) updateData.costCenterId = input.costCenterId;

    const updated = await this.db.purchaseRequest.update({
      where: { id },
      data: updateData as any,
      include: { items: true },
    });

    // Update items if provided
    if (input.items) {
      await this.db.purchaseRequestItem.deleteMany({
        where: { purchaseRequestId: id },
      });
      for (const item of input.items) {
        await this.db.purchaseRequestItem.create({
          data: {
            tenantId: this.session.tenantId,
            purchaseRequestId: id,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
            productUrl: item.productUrl ?? null,
          },
        });
      }

      // Recalculate estimated total
      const total = input.items.reduce((sum, item) => {
        return sum + (item.estimatedPrice ? item.estimatedPrice * item.quantity : 0);
      }, 0);
      await this.db.purchaseRequest.update({
        where: { id },
        data: { estimatedTotal: total > 0 ? Number(total) : null },
      });
    }

    await this.audit.log({
      action: 'update',
      resource: 'purchase_request',
      resourceId: id,
      moduleId: 'procurement',
      previousData: { title: existing.title, status: existing.status },
      newData: { title: updated.title, status: updated.status },
    });

    return this.getById(id);
  }

  async transition(id: number, action: string, notes?: string, version?: number) {
    const pr = await this.getById(id);

    // Optimistic locking
    if (version !== undefined && version !== pr.version) {
      throw new ApiError('CONFLICT', 'This record has been modified by another user', 409);
    }

    // Check if any user in the tenant holds the buyer (process) permission.
    // Result is cached per tenant for 5 minutes to avoid a multi-join query on every approve transition.
    const hasBuyerUsers = await cached(
      `t:${this.session.tenantId}:procurement:has_buyer_users`,
      300_000,
      async () => {
        const count = await this.db.user.count({
          where: {
            active: true,
            deletedAt: null,
            userRoles: {
              some: {
                role: {
                  rolePermissions: {
                    some: {
                      permission: {
                        moduleId: 'procurement',
                        resource: 'purchase_request',
                        action: 'process',
                      },
                    },
                  },
                },
              },
            },
          },
        });
        return count > 0;
      },
    );

    // Budget check for approve action
    let budgetAvailable: boolean | undefined = undefined;
    if (action === 'approve' && pr.costCenterId) {
      const costCenter = await this.db.costCenter.findUnique({ where: { id: pr.costCenterId } });
      if (costCenter?.annualBudget) {
        const currentYear = new Date().getFullYear();
        const committed = await this.db.purchaseRequest.aggregate({
          where: {
            costCenterId: pr.costCenterId,
            status: { in: ['submitted', 'validated', 'approved', 'in_procurement', 'payment_scheduled', 'purchased'] },
            id: { not: id },
            createdAt: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) },
            deletedAt: null,
          },
          _sum: { estimatedTotal: true },
        });
        const committedAmount = Number(committed._sum.estimatedTotal ?? 0);
        const thisAmount = pr.estimatedTotal ? Number(pr.estimatedTotal) : 0;
        budgetAvailable = committedAmount + thisAmount <= Number(costCenter.annualBudget);
      }
    }

    // Build workflow context
    const context: PurchaseRequestWorkflowContext = {
      userId: this.session.userId,
      requesterId: pr.requesterId,
      validatedById: pr.validatedById,
      approvedById: pr.approvedById,
      departmentId: pr.departmentId,
      estimatedTotal: pr.estimatedTotal ? Number(pr.estimatedTotal) : null,
      hasBuyerUsers,
      receptionConforming: true,
      allItemsReceived: false,
      hasIssues: false,
      budgetAvailable,
    };

    // Execute state machine (permissions + segregation enforced inside the engine)
    const userPermissions = new Set(this.session.permissions);
    let newState: string;
    try {
      ({ newState } = await purchaseRequestWorkflow.transition(pr.status, action, context, userPermissions));
    } catch (err) {
      if (err instanceof GuardError) {
        throw new ApiError('FORBIDDEN', err.reason, 403);
      }
      if (err instanceof TransitionError) {
        throw new ApiError('BAD_REQUEST', err.message, 400);
      }
      throw err;
    }

    // Build update data based on action
    const updateData: Record<string, unknown> = {
      status: newState,
      version: { increment: 1 },
      updatedBy: this.session.userId,
    };

    switch (action) {
      case 'submit':
        updateData.submittedAt = new Date();
        break;
      case 'validate':
        updateData.validatedById = this.session.userId;
        updateData.validatedAt = new Date();
        if (notes) updateData.validationNotes = notes;
        break;
      case 'approve':
        updateData.approvedById = this.session.userId;
        updateData.approvedAt = new Date();
        if (notes) updateData.approvalNotes = notes;
        break;
      case 'reject':
        updateData.rejectedById = this.session.userId;
        updateData.rejectedAt = new Date();
        if (notes) updateData.rejectionReason = notes;
        break;
      case 'process':
        updateData.processedById = this.session.userId;
        updateData.processedAt = new Date();
        if (notes) updateData.processingNotes = notes;
        break;
    }

    const updated = await this.db.purchaseRequest.update({
      where: { id },
      data: updateData as any,
    });

    // Emit notifications (fire-and-forget)
    const notifService = new NotificationService(this.session.tenantId);
    (async () => {
      try {
        const prNumber = pr.number;
        const prTitle = pr.title;
        const prLink = `purchase_request`;
        switch (action) {
          case 'submit':
            await notifService.notifyUsersWithPermission('procurement.purchase_request.validate', 'pr_submitted', 'Purchase Request Submitted', `PR ${prNumber} "${prTitle}" is ready for validation`, prLink, id);
            break;
          case 'validate':
            await notifService.notifyUsersWithPermission('procurement.purchase_request.approve', 'pr_validated', 'Purchase Request Validated', `PR ${prNumber} "${prTitle}" has been validated and is awaiting approval`, prLink, id);
            break;
          case 'approve':
            await notifService.notifyUser(pr.requesterId, 'pr_approved', 'Purchase Request Approved', `Your PR ${prNumber} "${prTitle}" has been approved`, prLink, id);
            if (hasBuyerUsers) {
              await notifService.notifyUsersWithPermission('procurement.purchase_request.process', 'pr_ready_to_process', 'Purchase Request Ready to Process', `PR ${prNumber} "${prTitle}" is ready for procurement`, prLink, id);
            }
            break;
          case 'reject':
            await notifService.notifyUser(pr.requesterId, 'pr_rejected', 'Purchase Request Rejected', `Your PR ${prNumber} "${prTitle}" has been rejected${notes ? ': ' + notes : ''}`, prLink, id);
            break;
          case 'return':
            await notifService.notifyUser(pr.requesterId, 'pr_returned', 'Purchase Request Returned', `Your PR ${prNumber} "${prTitle}" has been returned for revision`, prLink, id);
            break;
          case 'cancel': {
            const toNotify = [pr.validatedById, pr.approvedById].filter(Boolean) as number[];
            for (const uid of toNotify) {
              if (uid !== this.session.userId) {
                await notifService.notifyUser(uid, 'pr_cancelled', 'Purchase Request Cancelled', `PR ${prNumber} "${prTitle}" has been cancelled`, prLink, id);
              }
            }
            break;
          }
          case 'record_purchase':
            await notifService.notifyUser(pr.requesterId, 'pr_purchased', 'Purchase Recorded', `Your PR ${prNumber} "${prTitle}" has been purchased`, prLink, id);
            break;
          case 'close':
            await notifService.notifyUser(pr.requesterId, 'pr_closed', 'Purchase Request Closed', `PR ${prNumber} "${prTitle}" has been closed`, prLink, id);
            break;
        }
      } catch { /* notifications are non-critical */ }
    })();

    await this.audit.log({
      action: `transition.${action}`,
      resource: 'purchase_request',
      resourceId: id,
      moduleId: 'procurement',
      eventType: 'workflow',
      previousData: { status: pr.status },
      newData: { status: newState },
      metadata: { notes },
    });

    return updated;
  }
}
