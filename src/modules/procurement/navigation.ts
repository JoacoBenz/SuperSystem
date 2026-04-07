import type { NavigationItem } from '@/src/core/modules/types';

export const procurementNavigation: NavigationItem[] = [
  {
    key: '/procurement/requests/new',
    label: 'New Request',
    icon: 'PlusCircleOutlined',
    requiredPermissions: ['procurement.purchase_request.create'],
  },
  {
    key: '/procurement/requests',
    label: 'My Requests',
    icon: 'FileTextOutlined',
    requiredPermissions: ['procurement.purchase_request.read_own'],
  },
  {
    key: '/procurement/requests?view=validations',
    label: 'Validations',
    icon: 'CheckCircleOutlined',
    requiredPermissions: ['procurement.purchase_request.validate'],
    badge: {
      countEndpoint: '/api/v1/procurement/purchase-requests?status=submitted&count_only=true',
      permission: 'procurement.purchase_request.validate',
    },
  },
  {
    key: '/procurement/requests?view=approvals',
    label: 'Approvals',
    icon: 'AuditOutlined',
    requiredPermissions: ['procurement.purchase_request.approve'],
    badge: {
      countEndpoint: '/api/v1/procurement/purchase-requests?status=validated&count_only=true',
      permission: 'procurement.purchase_request.approve',
    },
  },
  {
    key: '/procurement/orders',
    label: 'Purchase Orders',
    icon: 'ShoppingCartOutlined',
    requiredPermissions: ['procurement.purchase_order.read'],
  },
  {
    key: '/procurement/receptions',
    label: 'Receptions',
    icon: 'InboxOutlined',
    requiredPermissions: ['procurement.reception.read'],
  },
  {
    key: '/procurement/vendors',
    label: 'Vendors',
    icon: 'ShopOutlined',
    requiredPermissions: ['procurement.vendor.read'],
  },
  {
    key: '/procurement/cost-centers',
    label: 'Cost Centers',
    icon: 'BankOutlined',
    requiredPermissions: ['procurement.cost_center.read'],
  },
];
