import type { NavigationItem } from '@/src/core/modules/types';

export const inventoryNavigation: NavigationItem[] = [
  {
    key: '/inventory/products',
    label: 'Products',
    icon: 'AppstoreOutlined',
    requiredPermissions: ['inventory.product.read'],
  },
  {
    key: '/inventory/categories',
    label: 'Categories',
    icon: 'TagsOutlined',
    requiredPermissions: ['inventory.product_category.read'],
  },
  {
    key: '/inventory/warehouses',
    label: 'Warehouses',
    icon: 'HomeOutlined',
    requiredPermissions: ['inventory.warehouse.read'],
  },
  {
    key: '/inventory/stock',
    label: 'Stock Levels',
    icon: 'BarChartOutlined',
    requiredPermissions: ['inventory.stock_level.read'],
  },
  {
    key: '/inventory/movements',
    label: 'Stock Movements',
    icon: 'SwapOutlined',
    requiredPermissions: ['inventory.stock_movement.read'],
  },
];
