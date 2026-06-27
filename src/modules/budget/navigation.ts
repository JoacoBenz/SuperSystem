import type { NavigationItem } from '@/src/core/modules/types';

export const budgetNavigation: NavigationItem[] = [
  {
    key: '/budget',
    label: 'Overview',
    icon: 'FundOutlined',
    requiredPermissions: ['budget.dashboard.read'],
  },
  {
    key: '/budget/list',
    label: 'Budgets',
    icon: 'ProfileOutlined',
    requiredPermissions: ['budget.budget.read'],
  },
  {
    key: '/budget/items',
    label: 'Line Items',
    icon: 'UnorderedListOutlined',
    requiredPermissions: ['budget.budget_item.read'],
  },
];
