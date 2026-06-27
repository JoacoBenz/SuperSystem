import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const budgetPermissions: PermissionDefinition[] = [
  { resource: 'budget', action: 'read', description: 'View budgets' },
  { resource: 'budget', action: 'manage', description: 'Create and manage budgets' },
  { resource: 'budget_item', action: 'read', description: 'View budget line items' },
  { resource: 'budget_item', action: 'manage', description: 'Create and manage budget line items' },
  { resource: 'dashboard', action: 'read', description: 'View budget dashboard' },
];

export const budgetRoles: RoleDefinition[] = [
  {
    name: 'budget.admin',
    displayName: 'Budget Administrator',
    permissions: [
      'budget.budget.read',
      'budget.budget.manage',
      'budget.budget_item.read',
      'budget.budget_item.manage',
      'budget.dashboard.read',
    ],
  },
  {
    name: 'budget.analyst',
    displayName: 'Budget Analyst',
    permissions: [
      'budget.budget.read',
      'budget.budget_item.read',
      'budget.budget_item.manage',
      'budget.dashboard.read',
    ],
  },
  {
    name: 'budget.viewer',
    displayName: 'Budget Viewer',
    permissions: [
      'budget.budget.read',
      'budget.budget_item.read',
      'budget.dashboard.read',
    ],
  },
];
