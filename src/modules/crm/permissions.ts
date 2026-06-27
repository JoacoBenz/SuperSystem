import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const crmPermissions: PermissionDefinition[] = [
  { resource: 'contact', action: 'read', description: 'View CRM contacts' },
  { resource: 'contact', action: 'manage', description: 'Create and manage CRM contacts' },
  { resource: 'company', action: 'read', description: 'View CRM companies' },
  { resource: 'company', action: 'manage', description: 'Create and manage CRM companies' },
  { resource: 'opportunity', action: 'read', description: 'View CRM opportunities' },
  { resource: 'opportunity', action: 'manage', description: 'Create and manage CRM opportunities' },
  { resource: 'dashboard', action: 'read', description: 'View CRM dashboard' },
];

export const crmRoles: RoleDefinition[] = [
  {
    name: 'crm.admin',
    displayName: 'CRM Administrator',
    permissions: [
      'crm.contact.read',
      'crm.contact.manage',
      'crm.company.read',
      'crm.company.manage',
      'crm.opportunity.read',
      'crm.opportunity.manage',
      'crm.dashboard.read',
    ],
  },
  {
    name: 'crm.rep',
    displayName: 'CRM Representative',
    permissions: [
      'crm.contact.read',
      'crm.company.read',
      'crm.opportunity.read',
      'crm.opportunity.manage',
      'crm.dashboard.read',
    ],
  },
  {
    name: 'crm.viewer',
    displayName: 'CRM Viewer',
    permissions: [
      'crm.contact.read',
      'crm.company.read',
      'crm.opportunity.read',
      'crm.dashboard.read',
    ],
  },
];
