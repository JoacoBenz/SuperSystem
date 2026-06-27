import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { treasuryPermissions, treasuryRoles } from './permissions';
import { treasuryNavigation } from './navigation';

const treasuryModule: ModuleDefinition = {
  id: 'treasury',
  name: 'Treasury',
  description: 'Treasury management — bank accounts, transactions, and cash flow',
  version: '1.0.0',
  dependencies: [],
  permissions: treasuryPermissions,
  roles: treasuryRoles,
  navigation: treasuryNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
};

moduleRegistry.register(treasuryModule);
