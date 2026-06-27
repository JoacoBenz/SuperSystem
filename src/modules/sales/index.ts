import { moduleRegistry } from '@/src/core/modules/registry';
import { salesPermissions, salesRoles } from './permissions';
import { salesNavigation } from './navigation';

moduleRegistry.register({
  id: 'sales',
  name: 'Sales',
  description: 'Customers, sales orders, and revenue tracking',
  version: '1.0.0',
  dependencies: [],
  permissions: salesPermissions,
  roles: salesRoles,
  navigation: salesNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
});
