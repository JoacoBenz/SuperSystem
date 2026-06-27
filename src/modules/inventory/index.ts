import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { inventoryPermissions, inventoryRoles } from './permissions';
import { inventoryNavigation } from './navigation';

export { StockService } from './services/stock.service';
export type { StockEntry, CreateStockEntryInput } from './types';

const inventoryModule: ModuleDefinition = {
  id: 'inventory',
  name: 'Inventory',
  description: 'Products, warehouses, stock levels, and stock movements',
  version: '1.0.0',
  dependencies: ['procurement'],
  permissions: inventoryPermissions,
  roles: inventoryRoles,
  navigation: inventoryNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
};

moduleRegistry.register(inventoryModule);
