import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const procurementPermissions: PermissionDefinition[] = [
  // Purchase Requests
  { resource: 'purchase_request', action: 'create', description: 'Create purchase requests' },
  { resource: 'purchase_request', action: 'read_own', description: 'View own purchase requests' },
  { resource: 'purchase_request', action: 'read_department', description: 'View department purchase requests' },
  { resource: 'purchase_request', action: 'read_all', description: 'View all purchase requests' },
  { resource: 'purchase_request', action: 'update_own', description: 'Edit own draft purchase requests' },
  { resource: 'purchase_request', action: 'submit', description: 'Submit purchase requests for review' },
  { resource: 'purchase_request', action: 'validate', description: 'Validate department purchase requests' },
  { resource: 'purchase_request', action: 'return', description: 'Return purchase requests to requester' },
  { resource: 'purchase_request', action: 'approve', description: 'Approve purchase requests' },
  { resource: 'purchase_request', action: 'reject', description: 'Reject purchase requests' },
  { resource: 'purchase_request', action: 'cancel', description: 'Cancel purchase requests' },
  { resource: 'purchase_request', action: 'process', description: 'Process approved purchase requests' },
  { resource: 'purchase_request', action: 'schedule_payment', description: 'Schedule payment for purchase requests' },
  { resource: 'purchase_request', action: 'close', description: 'Close completed purchase requests' },
  { resource: 'purchase_request', action: 'export', description: 'Export purchase request reports' },

  // Purchase Orders
  { resource: 'purchase_order', action: 'create', description: 'Create purchase orders' },
  { resource: 'purchase_order', action: 'read', description: 'View purchase orders' },

  // Receptions
  { resource: 'reception', action: 'create', description: 'Record goods reception' },
  { resource: 'reception', action: 'read', description: 'View reception records' },

  // Vendors
  { resource: 'vendor', action: 'read', description: 'View vendors' },
  { resource: 'vendor', action: 'manage', description: 'Create, edit, delete vendors' },

  // Cost Centers
  { resource: 'cost_center', action: 'read', description: 'View cost centers' },
  { resource: 'cost_center', action: 'manage', description: 'Create, edit, delete cost centers' },
];

export const procurementRoles: RoleDefinition[] = [
  {
    name: 'procurement.requester',
    displayName: 'Requester',
    permissions: [
      'procurement.purchase_request.create',
      'procurement.purchase_request.read_own',
      'procurement.purchase_request.update_own',
      'procurement.purchase_request.submit',
      'procurement.purchase_request.cancel',
      'procurement.reception.create',
      'procurement.reception.read',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.validator',
    displayName: 'Validator',
    permissions: [
      'procurement.purchase_request.read_department',
      'procurement.purchase_request.validate',
      'procurement.purchase_request.return',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.approver',
    displayName: 'Approver',
    permissions: [
      'procurement.purchase_request.read_all',
      'procurement.purchase_request.approve',
      'procurement.purchase_request.reject',
      'procurement.purchase_request.return',
      'procurement.purchase_request.cancel',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.buyer',
    displayName: 'Buyer',
    permissions: [
      'procurement.purchase_request.read_all',
      'procurement.purchase_request.process',
      'procurement.purchase_request.schedule_payment',
      'procurement.purchase_order.create',
      'procurement.purchase_order.read',
      'procurement.vendor.manage',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.treasurer',
    displayName: 'Treasurer',
    permissions: [
      'procurement.purchase_request.read_all',
      'procurement.purchase_request.close',
      'procurement.purchase_order.read',
      'procurement.purchase_order.create',
      'procurement.reception.read',
      'procurement.vendor.read',
      'procurement.cost_center.manage',
      'procurement.cost_center.read',
      'procurement.purchase_request.export',
    ],
  },
];
