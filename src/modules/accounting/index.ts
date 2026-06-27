import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { accountingPermissions, accountingRoles } from './permissions';
import { accountingNavigation } from './navigation';

const accountingModule: ModuleDefinition = {
  id: 'accounting',
  name: 'Accounting',
  description: 'Double-entry bookkeeping — chart of accounts, journal entries, and financial reports',
  version: '1.0.0',
  dependencies: [],
  permissions: accountingPermissions,
  roles: accountingRoles,
  navigation: accountingNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
};

moduleRegistry.register(accountingModule);
