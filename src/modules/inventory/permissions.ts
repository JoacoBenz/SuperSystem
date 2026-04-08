import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const inventoryPermissions: PermissionDefinition[] = [
  // Products
  { resource: 'product', action: 'create', description: 'Create products' },
  { resource: 'product', action: 'read', description: 'View products' },
  { resource: 'product', action: 'manage', description: 'Create, edit, delete products' },

  // Product Categories
  { resource: 'product_category', action: 'read', description: 'View product categories' },
  { resource: 'product_category', action: 'manage', description: 'Create, edit, delete product categories' },

  // Warehouses
  { resource: 'warehouse', action: 'read', description: 'View warehouses' },
  { resource: 'warehouse', action: 'manage', description: 'Create, edit, delete warehouses' },

  // Stock Levels
  { resource: 'stock_level', action: 'read', description: 'View stock levels' },

  // Stock Movements
  { resource: 'stock_movement', action: 'create', description: 'Record stock movements' },
  { resource: 'stock_movement', action: 'read', description: 'View stock movement history' },
];

export const inventoryRoles: RoleDefinition[] = [
  {
    name: 'inventory.viewer',
    displayName: 'Viewer',
    permissions: [
      'inventory.product.read',
      'inventory.stock_level.read',
      'inventory.stock_movement.read',
    ],
  },
  {
    name: 'inventory.operator',
    displayName: 'Operator',
    permissions: [
      'inventory.product.read',
      'inventory.product_category.read',
      'inventory.warehouse.read',
      'inventory.stock_level.read',
      'inventory.stock_movement.create',
      'inventory.stock_movement.read',
    ],
  },
  {
    name: 'inventory.manager',
    displayName: 'Manager',
    permissions: [
      'inventory.product.create',
      'inventory.product.read',
      'inventory.product.manage',
      'inventory.product_category.read',
      'inventory.product_category.manage',
      'inventory.warehouse.read',
      'inventory.warehouse.manage',
      'inventory.stock_level.read',
      'inventory.stock_movement.create',
      'inventory.stock_movement.read',
    ],
  },
];
