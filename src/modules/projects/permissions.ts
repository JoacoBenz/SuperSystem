import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';

export const projectsPermissions: PermissionDefinition[] = [
  // Projects
  { resource: 'project', action: 'read', description: 'View projects' },
  { resource: 'project', action: 'manage', description: 'Create, edit, and delete projects' },

  // Tasks
  { resource: 'task', action: 'read', description: 'View tasks' },
  { resource: 'task', action: 'manage', description: 'Create, edit, and delete tasks' },

  // Time Entries
  { resource: 'time_entry', action: 'read', description: 'View time entries' },
  { resource: 'time_entry', action: 'manage', description: 'Log and edit time entries' },
];

export const projectsRoles: RoleDefinition[] = [
  {
    name: 'projects.manager',
    displayName: 'Project Manager',
    permissions: [
      'projects.project.read',
      'projects.project.manage',
      'projects.task.read',
      'projects.task.manage',
      'projects.time_entry.read',
      'projects.time_entry.manage',
    ],
  },
  {
    name: 'projects.member',
    displayName: 'Project Member',
    permissions: [
      'projects.project.read',
      'projects.task.read',
      'projects.task.manage',
      'projects.time_entry.read',
      'projects.time_entry.manage',
    ],
  },
  {
    name: 'projects.viewer',
    displayName: 'Project Viewer',
    permissions: [
      'projects.project.read',
      'projects.task.read',
      'projects.time_entry.read',
    ],
  },
];
