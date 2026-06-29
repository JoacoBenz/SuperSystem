import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const inventoryPermissions: PermissionDefinition[] = [
  { resource: 'stock_entry', action: 'read', description: 'View stock entries and reception history' },
  { resource: 'stock_entry', action: 'manage', description: 'Manage stock entries' },
  { resource: 'stock_adjustment', action: 'read', description: 'View stock adjustments' },
  { resource: 'stock_adjustment', action: 'create', description: 'Create stock adjustments' },
  { resource: 'product', action: 'read', description: 'View the product / material master' },
  { resource: 'product', action: 'manage', description: 'Create, edit and retire products' },
];

export const inventoryRoles: RoleDefinition[] = [
  {
    name: 'inventory.warehouse_manager',
    displayName: 'Warehouse Manager',
    permissions: [
      'inventory.stock_entry.read',
      'inventory.stock_entry.manage',
      'inventory.stock_adjustment.read',
      'inventory.stock_adjustment.create',
      'inventory.product.read',
      'inventory.product.manage',
    ],
  },
  {
    name: 'inventory.viewer',
    displayName: 'Inventory Viewer',
    permissions: [
      'inventory.stock_entry.read',
      'inventory.stock_adjustment.read',
      'inventory.product.read',
    ],
  },
];
