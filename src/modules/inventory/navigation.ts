import type { NavigationItem } from '@/src/core/modules/types';

export const inventoryNavigation: NavigationItem[] = [
  {
    key: '/inventory',
    label: 'Stock Levels',
    icon: 'BarChartOutlined',
    requiredPermissions: ['inventory.stock_entry.read'],
  },
  {
    key: '/inventory/entries',
    label: 'Reception History',
    icon: 'InboxOutlined',
    requiredPermissions: ['inventory.stock_entry.read'],
  },
  {
    key: '/inventory/adjustments',
    label: 'Adjustments',
    icon: 'EditOutlined',
    requiredPermissions: ['inventory.stock_adjustment.read'],
  },
];
