import type { NavigationItem } from '@/src/core/modules/types';

export const hrNavigation: NavigationItem[] = [
  {
    key: '/hr',
    label: 'Dashboard',
    icon: 'FundOutlined',
    requiredPermissions: ['hr.dashboard.read'],
  },
  {
    key: '/hr/employees',
    label: 'Employees',
    icon: 'TeamOutlined',
    requiredPermissions: ['hr.employee.read'],
  },
];
