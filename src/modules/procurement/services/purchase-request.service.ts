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

  async listForBuyer(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    statuses?: string[];
    search?: string;
  }) {
    const { page = 1, pageSize = 20, status, statuses, search } = params;
    const where: Record<string, unknown> = { deletedAt: null };

    if (status) {
      where.status = status;
    } else if (statuses) {
      where.status = { in: statuses };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.purchaseRequest.findMany({
        where: where as any,
        include: {
          vendor: { select: { id: true, name: true } },
          costCenter: { select: { id: true, name: true, code: true } },
          orders: { select: { id: true, totalAmount: true, purchaseDate: true, invoiceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
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

    // Auto-save items for future reuse
    this.saveItemsForReuse(input.items).catch(() => {});

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

  getAvailableActions(pr: any): Array<{ action: string; label: string; permitted: boolean }> {
    const userPerms = new Set(this.session.permissions);
    const allTransitions = purchaseRequestWorkflow['transitions'] as any[];

    // All transitions that match the current state
    const fromState = pr.status;
    const matchingTransitions = allTransitions.filter((t: any) => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(fromState);
    });

    // Deduplicate by action (some actions have multiple from states)
    const seen = new Set<string>();
    const actions: Array<{ action: string; label: string; permitted: boolean }> = [];
    for (const t of matchingTransitions) {
      if (seen.has(t.action)) continue;
      seen.add(t.action);

      const hasPermission = t.requiredPermissions.every((p: string) => userPerms.has(p));

      // Check segregation
      let segregationOk = true;
      if (hasPermission && t.segregationRule) {
        const rule = PROCUREMENT_SEGREGATION[t.segregationRule];
        if (rule) {
          const result = checkSegregation(rule, this.session.userId, pr as any);
          segregationOk = result.allowed;
        }
      }

      actions.push({
        action: t.action,
        label: t.label ?? t.action,
        permitted: hasPermission && segregationOk,
      });
    }
    return actions;
  }

  async transition(id: number, action: string, notes?: string, version?: number, data?: Record<string, unknown>) {
    const pr = await this.getById(id);

    // Optimistic locking
    if (version !== undefined && version !== pr.version) {
      throw new ApiError('CONFLICT', 'This record has been modified by another user', 409);
    }

    // Find matching transition
    const transition = purchaseRequestWorkflow['transitions'].find((t: any) => {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      return fromStates.includes(pr.status) && t.action === action;
    });

    if (!transition) {
      throw new ApiError('BAD_REQUEST', `Action "${action}" is not available for status "${pr.status}"`, 400);
    }

    // Check permissions
    const userPerms = new Set(this.session.permissions);
    const missingPerms = transition.requiredPermissions.filter((p: string) => !userPerms.has(p));
    if (missingPerms.length > 0) {
      throw new ApiError('FORBIDDEN', 'You do not have permission to perform this action', 403);
    }

    // Check segregation
    if (transition.segregationRule) {
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
      hasBuyerUsers: true,
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
      case 'start_procurement':
        updateData.processedById = this.session.userId;
        updateData.processedAt = new Date();
        if (notes) updateData.processingNotes = notes;
        break;
      case 'schedule_payment': {
        const paymentDate = data?.scheduledPaymentDate;
        if (!paymentDate) throw new ApiError('BAD_REQUEST', 'Payment date is required', 400);
        updateData.scheduledPaymentDate = new Date(paymentDate as string);
        break;
      }
      case 'record_purchase': {
        if (!data?.purchaseDate || !data?.totalAmount || !data?.paymentMethod) {
          throw new ApiError('BAD_REQUEST', 'Purchase date, total amount, and payment method are required', 400);
        }
        // Create PurchaseOrder record
        await this.db.purchaseOrder.create({
          data: {
            tenantId: this.session.tenantId,
            purchaseRequestId: id,
            executedById: this.session.userId,
            vendorId: pr.vendorId,
            vendorName: pr.vendor?.name ?? 'Unknown',
            vendorDetails: data.vendorDetails as string ?? null,
            purchaseDate: new Date(data.purchaseDate as string),
            totalAmount: Number(data.totalAmount),
            paymentMethod: data.paymentMethod as string,
            bankReference: (data.bankReference as string) || null,
            invoiceNumber: (data.invoiceNumber as string) || null,
            notes: notes || null,
          },
        });
        break;
      }
      case 'record_reception': {
        const conforming = data?.conforming !== false;
        const issueType = (data?.issueType as string) || null;
        const receptionItems = data?.items as Array<{ purchaseRequestItemId: number; quantityReceived: number; conforming: boolean; notes?: string }> | undefined;

        // Create Reception record
        const reception = await this.db.reception.create({
          data: {
            tenantId: this.session.tenantId,
            purchaseRequestId: id,
            receiverId: this.session.userId,
            conforming,
            issueType: conforming ? null : issueType,
            notes: notes || null,
            items: receptionItems?.length ? {
              create: receptionItems.map(item => ({
                tenantId: this.session.tenantId,
                purchaseRequestItemId: item.purchaseRequestItemId,
                quantityReceived: item.quantityReceived,
                conforming: item.conforming ?? true,
                notes: item.notes ?? null,
              })),
            } : undefined,
          },
        });

        // Update workflow context based on reception data
        const hasIssues = !conforming || receptionItems?.some(i => !i.conforming);
        if (hasIssues) {
          context.hasIssues = true;
          context.receptionConforming = false;
        }
        context.allItemsReceived = true; // For now, assume full reception
        // Re-evaluate new state with updated context
        const receptionResult = await purchaseRequestWorkflow.transition(pr.status, action, context);
        updateData.status = receptionResult.newState;
        break;
      }
      case 'cancel':
        if (notes) updateData.cancellationReason = notes;
        break;
      case 'escalate_issue':
      case 'return_to_vendor':
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

    return { ...updated, _transitionLabel: transition.label };
  }

  private async saveItemsForReuse(items: Array<{ description: string; unit?: string; estimatedPrice?: number | null; productUrl?: string | null }>) {
    for (const item of items) {
      try {
        await this.db.procurementSavedItem.upsert({
          where: {
            tenantId_userId_description: {
              tenantId: this.session.tenantId,
              userId: this.session.userId,
              description: item.description,
            },
          },
          update: {
            unit: item.unit ?? 'units',
            estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
            productUrl: item.productUrl ?? null,
            useCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
          create: {
            tenantId: this.session.tenantId,
            userId: this.session.userId,
            description: item.description,
            unit: item.unit ?? 'units',
            estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
            productUrl: item.productUrl ?? null,
          },
        });
      } catch {}
    }
  }
}
