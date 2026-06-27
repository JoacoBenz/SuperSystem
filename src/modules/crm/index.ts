import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { crmPermissions, crmRoles } from './permissions';
import { crmNavigation } from './navigation';

const crmModule: ModuleDefinition = {
  id: 'crm',
  name: 'CRM',
  description: 'Customer relationship management — companies, contacts, and sales opportunities',
  version: '1.0.0',
  dependencies: [],
  permissions: crmPermissions,
  roles: crmRoles,
  navigation: crmNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
};

moduleRegistry.register(crmModule);
