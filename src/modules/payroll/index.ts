import { moduleRegistry } from '@/src/core/modules/registry';
import { payrollPermissions, payrollRoles } from './permissions';
import { payrollNavigation } from './navigation';

moduleRegistry.register({
  id: 'payroll',
  name: 'Payroll',
  description: 'Salary structures, payroll runs, payslips, and tax calculation',
  version: '1.0.0',
  dependencies: ['hr'],
  permissions: payrollPermissions,
  roles: payrollRoles,
  navigation: payrollNavigation,
  dashboardWidgets: [],
  workflows: [],
  reports: [],
});
