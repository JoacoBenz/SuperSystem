import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const salesPermissions: PermissionDefinition[] = [
  { resource: 'customer', action: 'read', description: 'View customers' },
  { resource: 'customer', action: 'manage', description: 'Create and manage customers' },
  { resource: 'order', action: 'read', description: 'View sales orders' },
  { resource: 'order', action: 'manage', description: 'Create and manage sales orders' },
  { resource: 'dashboard', action: 'read', description: 'View sales dashboard' },
];

export const salesRoles: RoleDefinition[] = [
  {
    name: 'sales.admin',
    displayName: 'Sales Administrator',
    permissions: ['sales.customer.read', 'sales.customer.manage', 'sales.order.read', 'sales.order.manage', 'sales.dashboard.read'],
  },
  {
    name: 'sales.rep',
    displayName: 'Sales Representative',
    permissions: ['sales.customer.read', 'sales.order.read', 'sales.order.manage', 'sales.dashboard.read'],
  },
  {
    name: 'sales.viewer',
    displayName: 'Sales Viewer',
    permissions: ['sales.customer.read', 'sales.order.read', 'sales.dashboard.read'],
  },
];
