import type { TenantDB } from '@/src/core/db/tenant-client';
import type { AuditService } from '@/src/core/audit/service';
import type { SessionUser } from '@/src/shared/types/common';
import type { CreatePurchaseRequestInput, UpdatePurchaseRequestInput } from '../validators/purchase-request.schema';
import { purchaseRequestWorkflow } from '../workflows/purchase-request.workflow';
import { checkSegregation, PROCUREMENT_SEGREGATION } from '@/src/core/permissions/segregation';
import { ApiError } from '@/src/core/api/errors';
import type { PurchaseRequestWorkflowContext } from '../types';

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
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
            productUrl: item.productUrl ?? null,
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

    // Check segregation
    const transition = purchaseRequestWorkflow['transitions'].find((t: any) => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(pr.status) && t.action === action;
    });

    if (transition?.segregationRule) {
      const rule = PROCUREMENT_SEGREGATION[transition.segregationRule];
      if (rule) {
        const result = checkSegregation(rule, this.session.userId, pr as any);
        if (!result.allowed) {
          throw new ApiError('FORBIDDEN', result.reason!, 403);
        }
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
      hasBuyerUsers: true, // TODO: check if tenant has buyer users
      receptionConforming: true,
      allItemsReceived: false,
      hasIssues: false,
    };

    // Execute state machine
    const { newState } = await purchaseRequestWorkflow.transition(pr.status, action, context);

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
