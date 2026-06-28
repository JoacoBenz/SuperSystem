import type { NavigationItem } from '@/src/core/modules/types';

export const salesNavigation: NavigationItem[] = [
  {
    key: '/sales',
    label: 'Dashboard',
    icon: 'FundOutlined',
    requiredPermissions: ['sales.dashboard.read'],
  },
  {
    key: '/sales/orders',
    label: 'Sales Orders',
    icon: 'FileTextOutlined',
    requiredPermissions: ['sales.order.read'],
  },
  {
    key: '/sales/invoices',
    label: 'Invoices',
    icon: 'FileTextOutlined',
    requiredPermissions: ['sales.invoice.read'],
  },
  {
    key: '/sales/customers',
    label: 'Customers',
    icon: 'TeamOutlined',
    requiredPermissions: ['sales.customer.read'],
  },
];
