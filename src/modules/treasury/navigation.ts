import type { NavigationItem } from '@/src/core/modules/types';

export const treasuryNavigation: NavigationItem[] = [
  {
    key: '/treasury',
    label: 'Dashboard',
    icon: 'FundOutlined',
    requiredPermissions: ['treasury.dashboard.read'],
  },
  {
    key: '/treasury/accounts',
    label: 'Bank Accounts',
    icon: 'BankOutlined',
    requiredPermissions: ['treasury.bank_account.read'],
  },
  {
    key: '/treasury/transactions',
    label: 'Transactions',
    icon: 'TransactionOutlined',
    requiredPermissions: ['treasury.transaction.read'],
  },
];
