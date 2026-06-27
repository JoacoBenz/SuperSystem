import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';
import { budgetPermissions, budgetRoles } from './permissions';
import { budgetNavigation } from './navigation';

const budgetModule: ModuleDefinition = {
  id: 'budget',
  name: 'Budget',
  description: 'Budget management — fiscal year budgets, line items, and spend tracking',
  version: '1.0.0',
  dependencies: [],
  permissions: budgetPermissions,
  roles: budgetRoles,
  navigation: budgetNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
};

moduleRegistry.register(budgetModule);
