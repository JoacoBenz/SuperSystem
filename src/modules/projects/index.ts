import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { projectsPermissions, projectsRoles } from './permissions';
import { projectsNavigation } from './navigation';

const projectsModule: ModuleDefinition = {
  id: 'projects',
  name: 'Projects',
  description: 'Project management with tasks and time tracking',
  version: '1.0.0',
  dependencies: [],
  permissions: projectsPermissions,
  roles: projectsRoles,
  navigation: projectsNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
};

moduleRegistry.register(projectsModule);
