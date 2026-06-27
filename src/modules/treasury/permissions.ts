import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const treasuryPermissions: PermissionDefinition[] = [
  { resource: 'bank_account', action: 'read', description: 'View bank accounts' },
  { resource: 'bank_account', action: 'manage', description: 'Create and manage bank accounts' },
  { resource: 'transaction', action: 'read', description: 'View bank transactions' },
  { resource: 'transaction', action: 'manage', description: 'Create and manage bank transactions' },
  { resource: 'dashboard', action: 'read', description: 'View Treasury dashboard' },
];

export const treasuryRoles: RoleDefinition[] = [
  {
    name: 'treasury.admin',
    displayName: 'Treasury Administrator',
    permissions: [
      'treasury.bank_account.read',
      'treasury.bank_account.manage',
      'treasury.transaction.read',
      'treasury.transaction.manage',
      'treasury.dashboard.read',
    ],
  },
  {
    name: 'treasury.analyst',
    displayName: 'Treasury Analyst',
    permissions: [
      'treasury.bank_account.read',
      'treasury.transaction.read',
      'treasury.transaction.manage',
      'treasury.dashboard.read',
    ],
  },
  {
    name: 'treasury.viewer',
    displayName: 'Treasury Viewer',
    permissions: [
      'treasury.bank_account.read',
      'treasury.transaction.read',
      'treasury.dashboard.read',
    ],
  },
];
