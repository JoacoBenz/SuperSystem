import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { inventoryPermissions, inventoryRoles } from './permissions';
import { inventoryNavigation } from './navigation';

const inventoryModule: ModuleDefinition = {
  id: 'inventory',
  name: 'Inventory',
  description: 'Products, warehouses, stock levels, and stock movements',
  version: '1.0.0',
  dependencies: [],

  permissions: inventoryPermissions,
  roles: inventoryRoles,
  navigation: inventoryNavigation,
  workflows: [],

  dashboardWidgets: [
    {
      id: 'inventory.low_stock',
      component: 'inventory/LowStockWidget',
      requiredPermissions: ['inventory.stock_level.read'],
      defaultPosition: { col: 0, row: 0, width: 6, height: 4 },
    },
    {
      id: 'inventory.recent_movements',
      component: 'inventory/RecentMovementsWidget',
      requiredPermissions: ['inventory.stock_movement.read'],
      defaultPosition: { col: 6, row: 0, width: 6, height: 4 },
    },
    {
      id: 'inventory.stock_value',
      component: 'inventory/StockValueWidget',
      requiredPermissions: ['inventory.stock_level.read'],
      defaultPosition: { col: 0, row: 4, width: 12, height: 4 },
    },
  ],

  reports: [
    {
      id: 'inventory.current_stock',
      name: 'Current Stock Levels',
      description: 'Current stock quantities across all warehouses',
      moduleId: 'inventory',
      requiredPermissions: ['inventory.stock_level.read'],
    },
    {
      id: 'inventory.stock_valuation',
      name: 'Stock Valuation',
      description: 'Total value of stock across all warehouses',
      moduleId: 'inventory',
      requiredPermissions: ['inventory.stock_level.read'],
    },
    {
      id: 'inventory.movement_history',
      name: 'Stock Movement History',
      description: 'Historical record of all stock movements',
      moduleId: 'inventory',
      requiredPermissions: ['inventory.stock_movement.read'],
    },
    {
      id: 'inventory.low_stock_report',
      name: 'Low Stock Report',
      description: 'Products with stock levels below reorder thresholds',
      moduleId: 'inventory',
      requiredPermissions: ['inventory.stock_level.read'],
    },
  ],
};

moduleRegistry.register(inventoryModule);
