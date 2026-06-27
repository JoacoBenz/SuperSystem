import type { NavigationItem } from '@/src/core/modules/types';

export const accountingNavigation: NavigationItem[] = [
  {
    key: '/accounting',
    label: 'Dashboard',
    icon: 'FundOutlined',
    requiredPermissions: ['accounting.report.read'],
  },
  {
    key: '/accounting/accounts',
    label: 'Chart of Accounts',
    icon: 'ApartmentOutlined',
    requiredPermissions: ['accounting.account.read'],
  },
  {
    key: '/accounting/journals',
    label: 'Journal Entries',
    icon: 'BookOutlined',
    requiredPermissions: ['accounting.journal.read'],
  },
];
