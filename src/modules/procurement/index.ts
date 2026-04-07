import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { procurementPermissions, procurementRoles } from './permissions';
import { procurementNavigation } from './navigation';
import { purchaseRequestWorkflowConfig, purchaseRequestTransitions } from './workflows/purchase-request.workflow';

const procurementModule: ModuleDefinition = {
  id: 'procurement',
  name: 'Procurement',
  description: 'Purchase requests, approvals, purchase orders, and goods reception',
  version: '1.0.0',
  dependencies: [],

  permissions: procurementPermissions,
  roles: procurementRoles,
  navigation: procurementNavigation,

  dashboardWidgets: [
    {
      id: 'procurement.pending_approvals',
      component: 'procurement/PendingApprovalsWidget',
      requiredPermissions: ['procurement.purchase_request.approve'],
      defaultPosition: { col: 0, row: 0, width: 6, height: 4 },
    },
    {
      id: 'procurement.my_requests',
      component: 'procurement/MyRequestsWidget',
      requiredPermissions: ['procurement.purchase_request.read_own'],
      defaultPosition: { col: 6, row: 0, width: 6, height: 4 },
    },
    {
      id: 'procurement.spend_summary',
      component: 'procurement/SpendSummaryWidget',
      requiredPermissions: ['procurement.purchase_request.read_all'],
      defaultPosition: { col: 0, row: 4, width: 12, height: 4 },
    },
  ],

  workflows: [
    {
      id: 'procurement.purchase_request',
      resource: 'purchase_request',
      config: purchaseRequestWorkflowConfig,
      transitions: purchaseRequestTransitions,
    },
  ],

  reports: [
    {
      id: 'procurement.spend_by_vendor',
      name: 'Spend by Vendor',
      description: 'Total spending grouped by vendor',
      moduleId: 'procurement',
      requiredPermissions: ['procurement.purchase_request.read_all'],
    },
    {
      id: 'procurement.spend_by_department',
      name: 'Spend by Department',
      description: 'Total spending grouped by department',
      moduleId: 'procurement',
      requiredPermissions: ['procurement.purchase_request.read_all'],
    },
    {
      id: 'procurement.spend_by_cost_center',
      name: 'Spend by Cost Center',
      description: 'Total spending grouped by cost center',
      moduleId: 'procurement',
      requiredPermissions: ['procurement.purchase_request.read_all'],
    },
    {
      id: 'procurement.request_aging',
      name: 'Request Aging',
      description: 'Purchase requests by age and status',
      moduleId: 'procurement',
      requiredPermissions: ['procurement.purchase_request.read_all'],
    },
    {
      id: 'procurement.approval_turnaround',
      name: 'Approval Turnaround Time',
      description: 'Average time from submission to approval',
      moduleId: 'procurement',
      requiredPermissions: ['procurement.purchase_request.read_all'],
    },
  ],
};

moduleRegistry.register(procurementModule);
