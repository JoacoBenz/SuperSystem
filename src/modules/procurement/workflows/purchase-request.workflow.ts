import { StateMachine } from '@/src/core/state-machine/engine';
import type { StateMachineConfig, TransitionConfig } from '@/src/core/state-machine/types';
import type { PurchaseRequestWorkflowContext } from '../types';

const config: StateMachineConfig = {
  id: 'purchase_request',
  initial: 'draft',
  states: {
    draft:                 { label: 'Draft',                  editable: true },
    submitted:             { label: 'Submitted' },
    returned_by_validator: { label: 'Returned by Validator',  editable: true },
    validated:             { label: 'Validated' },
    returned_by_approver:  { label: 'Returned by Approver',   editable: true },
    approved:              { label: 'Approved' },
    in_procurement:        { label: 'In Procurement' },
    payment_scheduled:     { label: 'Payment Scheduled' },
    purchased:             { label: 'Purchased' },
    received:              { label: 'Received' },
    received_with_issues:  { label: 'Received with Issues' },
    pending_resolution:    { label: 'Pending Resolution' },
    rejected:              { label: 'Rejected',      terminal: true },
    cancelled:             { label: 'Cancelled',     terminal: true },
    closed:                { label: 'Closed',        terminal: true },
  },
};

const transitions: TransitionConfig<PurchaseRequestWorkflowContext>[] = [
  // ── Requester actions ──────────────────────────────────────────────
  {
    action: 'submit',
    from: ['draft', 'returned_by_validator', 'returned_by_approver'],
    to: 'submitted',
    label: 'Submit for Review',
    requiredPermissions: ['procurement.purchase_request.submit'],
    guards: [{
      name: 'is_owner',
      description: 'Only the requester can submit',
      check: ctx => ({ pass: ctx.userId === ctx.requesterId }),
    }],
  },

  // ── Validator actions ──────────────────────────────────────────────
  {
    action: 'validate',
    from: 'submitted',
    to: 'validated',
    label: 'Validate',
    requiredPermissions: ['procurement.purchase_request.validate'],
    segregationRule: 'validate',
  },
  {
    action: 'return_to_requester',
    from: 'submitted',
    to: 'returned_by_validator',
    label: 'Return to Requester',
    requiredPermissions: ['procurement.purchase_request.return'],
    segregationRule: 'validate',
  },
  // Validator can reject at submitted stage
  {
    action: 'reject',
    from: 'submitted',
    to: 'rejected',
    label: 'Reject',
    requiredPermissions: ['procurement.purchase_request.validate'],
    segregationRule: 'validate',
  },

  // ── Approver actions ───────────────────────────────────────────────
  {
    action: 'approve',
    from: 'validated',
    to: 'approved',
    label: 'Approve',
    requiredPermissions: ['procurement.purchase_request.approve'],
    segregationRule: 'approve',
  },
  {
    action: 'return_to_requester',
    from: 'validated',
    to: 'returned_by_approver',
    label: 'Return to Requester',
    requiredPermissions: ['procurement.purchase_request.return'],
    segregationRule: 'approve',
  },
  // Approver can reject at validated stage
  {
    action: 'reject',
    from: 'validated',
    to: 'rejected',
    label: 'Reject',
    requiredPermissions: ['procurement.purchase_request.reject'],
    segregationRule: 'approve',
  },

  // ── Buyer actions ──────────────────────────────────────────────────
  {
    action: 'start_procurement',
    from: 'approved',
    to: 'in_procurement',
    label: 'Start Procurement',
    requiredPermissions: ['procurement.purchase_request.process'],
    segregationRule: 'purchase',
  },
  // Schedule payment is optional — buyer can go straight to record_purchase
  {
    action: 'schedule_payment',
    from: 'in_procurement',
    to: 'payment_scheduled',
    label: 'Schedule Payment',
    requiredPermissions: ['procurement.purchase_request.schedule_payment'],
    segregationRule: 'purchase',
  },
  // Record purchase: from in_procurement (skip payment scheduling) or payment_scheduled
  {
    action: 'record_purchase',
    from: ['in_procurement', 'payment_scheduled'],
    to: 'purchased',
    label: 'Record Purchase',
    requiredPermissions: ['procurement.purchase_order.create'],
    segregationRule: 'purchase',
  },

  // ── Requester: reception ───────────────────────────────────────────
  {
    action: 'record_reception',
    from: 'purchased',
    to: (ctx) => {
      if (ctx.allItemsReceived && !ctx.hasIssues) return 'received';
      if (ctx.allItemsReceived && ctx.hasIssues) return 'received_with_issues';
      if (!ctx.allItemsReceived) return 'purchased'; // partial reception stays purchased
      if (ctx.receptionConforming) return 'received';
      return 'received_with_issues';
    },
    label: 'Record Reception',
    requiredPermissions: ['procurement.reception.create'],
    segregationRule: 'receive',
  },

  // ── Issue resolution ───────────────────────────────────────────────
  // Buyer escalates issues for resolution
  {
    action: 'escalate_issue',
    from: 'received_with_issues',
    to: 'pending_resolution',
    label: 'Escalate for Resolution',
    requiredPermissions: ['procurement.purchase_request.process'],
  },
  // Buyer resolves and returns to purchased (vendor resend, replacement, etc.)
  {
    action: 'return_to_vendor',
    from: ['received_with_issues', 'pending_resolution'],
    to: 'purchased',
    label: 'Return to Vendor (Await Redelivery)',
    requiredPermissions: ['procurement.purchase_request.process'],
  },
  // Re-receive after issue resolution
  {
    action: 'record_reception',
    from: 'pending_resolution',
    to: (ctx) => {
      if (ctx.allItemsReceived && !ctx.hasIssues) return 'received';
      if (ctx.hasIssues) return 'received_with_issues';
      return 'received';
    },
    label: 'Record Reception',
    requiredPermissions: ['procurement.reception.create'],
    segregationRule: 'receive',
  },

  // ── Treasurer: close ───────────────────────────────────────────────
  {
    action: 'close',
    from: ['received', 'received_with_issues'],
    to: 'closed',
    label: 'Close Request',
    requiredPermissions: ['procurement.purchase_request.close'],
  },

  // ── Cancel ─────────────────────────────────────────────────────────
  // Requester cancels own request in early stages
  {
    action: 'cancel',
    from: ['draft', 'submitted', 'returned_by_validator', 'returned_by_approver'],
    to: 'cancelled',
    label: 'Cancel Request',
    requiredPermissions: ['procurement.purchase_request.cancel'],
    guards: [{
      name: 'is_owner',
      description: 'Only the requester can cancel in early stages',
      check: ctx => ({ pass: ctx.userId === ctx.requesterId }),
    }],
  },
  // Approver cancels from validated (before procurement starts)
  {
    action: 'cancel',
    from: 'validated',
    to: 'cancelled',
    label: 'Cancel Request',
    requiredPermissions: ['procurement.purchase_request.reject'],
    segregationRule: 'approve',
  },
  // Buyer cancels during procurement stages
  {
    action: 'cancel',
    from: ['approved', 'in_procurement', 'payment_scheduled'],
    to: 'cancelled',
    label: 'Cancel Request',
    requiredPermissions: ['procurement.purchase_request.process'],
  },
];

export const purchaseRequestWorkflow = new StateMachine<PurchaseRequestWorkflowContext>(
  config,
  transitions,
);

export { config as purchaseRequestWorkflowConfig, transitions as purchaseRequestTransitions };
