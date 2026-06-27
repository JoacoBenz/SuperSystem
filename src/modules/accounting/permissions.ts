import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const accountingPermissions: PermissionDefinition[] = [
  { resource: 'account', action: 'read', description: 'View chart of accounts' },
  { resource: 'account', action: 'manage', description: 'Create and manage chart of accounts' },
  { resource: 'journal', action: 'read', description: 'View journal entries' },
  { resource: 'journal', action: 'manage', description: 'Create and manage journal entries' },
  { resource: 'journal', action: 'post', description: 'Post journal entries' },
  { resource: 'report', action: 'read', description: 'View accounting reports' },
];

export const accountingRoles: RoleDefinition[] = [
  {
    name: 'accounting.admin',
    displayName: 'Accounting Administrator',
    permissions: [
      'accounting.account.read',
      'accounting.account.manage',
      'accounting.journal.read',
      'accounting.journal.manage',
      'accounting.journal.post',
      'accounting.report.read',
    ],
  },
  {
    name: 'accounting.accountant',
    displayName: 'Accountant',
    permissions: [
      'accounting.account.read',
      'accounting.journal.read',
      'accounting.journal.manage',
      'accounting.journal.post',
      'accounting.report.read',
    ],
  },
  {
    name: 'accounting.viewer',
    displayName: 'Accounting Viewer',
    permissions: [
      'accounting.account.read',
      'accounting.journal.read',
      'accounting.report.read',
    ],
  },
];
