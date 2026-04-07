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
    rejected:              { label: 'Rejected',      terminal: true },
    cancelled:             { label: 'Cancelled',     terminal: true },
    closed:                { label: 'Closed',        terminal: true },
  },
};

const transitions: TransitionConfig<PurchaseRequestWorkflowContext>[] = [
  // Submit
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

  // Validate
  {
    action: 'validate',
    from: 'submitted',
    to: 'validated',
    label: 'Validate',
    requiredPermissions: ['procurement.purchase_request.validate'],
    segregationRule: 'validate',
  },

  // Return by validator
  {
    action: 'return',
    from: 'submitted',
    to: 'returned_by_validator',
    label: 'Return to Requester',
    requiredPermissions: ['procurement.purchase_request.return'],
    segregationRule: 'validate',
  },

  // Approve
  {
    action: 'approve',
    from: 'validated',
    to: (ctx) => ctx.hasBuyerUsers ? 'in_procurement' : 'approved',
    label: 'Approve',
    requiredPermissions: ['procurement.purchase_request.approve'],
    segregationRule: 'approve',
  },

  // Return by approver
  {
    action: 'return',
    from: 'validated',
    to: 'returned_by_approver',
    label: 'Return to Requester',
    requiredPermissions: ['procurement.purchase_request.return'],
    segregationRule: 'approve',
  },

  // Reject
  {
    action: 'reject',
    from: ['submitted', 'validated'],
    to: 'rejected',
    label: 'Reject',
    requiredPermissions: ['procurement.purchase_request.reject'],
  },

  // Process
  {
    action: 'process',
    from: ['approved', 'in_procurement'],
    to: 'in_procurement',
    label: 'Process',
    requiredPermissions: ['procurement.purchase_request.process'],
    segregationRule: 'purchase',
  },

  // Schedule payment
  {
    action: 'schedule_payment',
    from: 'in_procurement',
    to: 'payment_scheduled',
    label: 'Schedule Payment',
    requiredPermissions: ['procurement.purchase_request.schedule_payment'],
  },

  // Record purchase
  {
    action: 'record_purchase',
    from: ['approved', 'in_procurement', 'payment_scheduled'],
    to: 'purchased',
    label: 'Record Purchase',
    requiredPermissions: ['procurement.purchase_order.create'],
    segregationRule: 'purchase',
  },

  // Record reception
  {
    action: 'record_reception',
    from: 'purchased',
    to: (ctx) => {
      if (ctx.allItemsReceived && !ctx.hasIssues) return 'received';
      if (ctx.allItemsReceived && ctx.hasIssues) return 'received_with_issues';
      if (!ctx.allItemsReceived) return 'purchased'; // partial reception
      if (ctx.receptionConforming) return 'received';
      return 'received_with_issues';
    },
    label: 'Record Reception',
    requiredPermissions: ['procurement.reception.create'],
  },

  // Close
  {
    action: 'close',
    from: ['received', 'received_with_issues'],
    to: 'closed',
    label: 'Close',
    requiredPermissions: ['procurement.purchase_request.close'],
  },

  // Cancel
  {
    action: 'cancel',
    from: ['draft', 'submitted', 'validated', 'approved', 'in_procurement', 'payment_scheduled'],
    to: 'cancelled',
    label: 'Cancel',
    requiredPermissions: ['procurement.purchase_request.cancel'],
  },
];

export const purchaseRequestWorkflow = new StateMachine<PurchaseRequestWorkflowContext>(
  config,
  transitions,
);

export { config as purchaseRequestWorkflowConfig, transitions as purchaseRequestTransitions };
