import type { NavigationItem } from '@/src/core/modules/types';

export const payrollNavigation: NavigationItem[] = [
  {
    key: '/payroll',
    label: 'Dashboard',
    icon: 'FundOutlined',
    requiredPermissions: ['payroll.dashboard.read'],
  },
  {
    key: '/payroll/runs',
    label: 'Payroll Runs',
    icon: 'CalendarOutlined',
    requiredPermissions: ['payroll.run.read'],
  },
];
