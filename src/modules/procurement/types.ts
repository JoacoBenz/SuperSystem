export interface PurchaseRequestWorkflowContext {
  userId: number;
  requesterId: number;
  validatedById: number | null;
  approvedById: number | null;
  departmentId: number;
  estimatedTotal: number | null;
  hasBuyerUsers: boolean;
  receptionConforming: boolean;
  allItemsReceived: boolean;
  hasIssues: boolean;
}

export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'returned_by_validator'
  | 'validated'
  | 'returned_by_approver'
  | 'approved'
  | 'in_procurement'
  | 'payment_scheduled'
  | 'purchased'
  | 'received'
  | 'received_with_issues'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  returned_by_validator: 'Returned by Validator',
  validated: 'Validated',
  returned_by_approver: 'Returned by Approver',
  approved: 'Approved',
  in_procurement: 'In Procurement',
  payment_scheduled: 'Payment Scheduled',
  purchased: 'Purchased',
  received: 'Received',
  received_with_issues: 'Received with Issues',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

export const PURCHASE_REQUEST_STATUS_COLORS: Record<PurchaseRequestStatus, string> = {
  draft: 'default',
  submitted: 'processing',
  returned_by_validator: 'warning',
  validated: 'cyan',
  returned_by_approver: 'warning',
  approved: 'blue',
  in_procurement: 'geekblue',
  payment_scheduled: 'purple',
  purchased: 'magenta',
  received: 'green',
  received_with_issues: 'orange',
  rejected: 'red',
  cancelled: 'default',
  closed: 'success',
};

export const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'default' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
] as const;
