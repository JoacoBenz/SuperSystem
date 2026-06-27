import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const payrollPermissions: PermissionDefinition[] = [
  { resource: 'run', action: 'read', description: 'View payroll runs and entries' },
  { resource: 'run', action: 'manage', description: 'Create and manage payroll runs' },
  { resource: 'run', action: 'approve', description: 'Approve and mark payroll as paid' },
  { resource: 'dashboard', action: 'read', description: 'View payroll dashboard' },
];

export const payrollRoles: RoleDefinition[] = [
  {
    name: 'payroll.admin',
    displayName: 'Payroll Administrator',
    permissions: ['payroll.run.read', 'payroll.run.manage', 'payroll.run.approve', 'payroll.dashboard.read'],
  },
  {
    name: 'payroll.manager',
    displayName: 'Payroll Manager',
    permissions: ['payroll.run.read', 'payroll.run.manage', 'payroll.dashboard.read'],
  },
  {
    name: 'payroll.viewer',
    displayName: 'Payroll Viewer',
    permissions: ['payroll.run.read', 'payroll.dashboard.read'],
  },
];
