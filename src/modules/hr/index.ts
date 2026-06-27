import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { hrPermissions, hrRoles } from './permissions';
import { hrNavigation } from './navigation';

const hrModule: ModuleDefinition = {
  id: 'hr',
  name: 'Human Resources',
  description: 'Employee directory, HR dashboard, and workforce management',
  version: '1.0.0',
  dependencies: [],

  permissions: hrPermissions,
  roles: hrRoles,
  navigation: hrNavigation,

  dashboardWidgets: [],

  workflows: [],

  reports: [],
};

moduleRegistry.register(hrModule);
