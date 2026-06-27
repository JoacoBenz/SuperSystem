import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const hrPermissions: PermissionDefinition[] = [
  { resource: 'employee', action: 'read', description: 'View employee directory' },
  { resource: 'employee', action: 'manage', description: 'Manage employee profiles' },
  { resource: 'dashboard', action: 'read', description: 'View HR dashboard' },
];

export const hrRoles: RoleDefinition[] = [
  {
    name: 'hr.admin',
    displayName: 'HR Administrator',
    permissions: ['hr.employee.read', 'hr.employee.manage', 'hr.dashboard.read'],
  },
  {
    name: 'hr.manager',
    displayName: 'HR Manager',
    permissions: ['hr.employee.read', 'hr.dashboard.read'],
  },
  {
    name: 'hr.employee',
    displayName: 'Employee',
    permissions: ['hr.employee.read'],
  },
];
