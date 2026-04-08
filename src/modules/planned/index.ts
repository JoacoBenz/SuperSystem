import { moduleRegistry } from '@/src/core/modules/registry';
import type { ModuleDefinition } from '@/src/core/modules/types';

const plannedModules: Omit<ModuleDefinition, 'dashboardWidgets' | 'workflows' | 'reports'>[] = [
  {
    id: 'budget',
    name: 'Budget',
    description: 'Budget planning, execution tracking, and variance analysis',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'hr',
    name: 'HR',
    description: 'Employee lifecycle, contracts, leave requests, and attendance',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Quotes, sales orders, invoices, credit notes, and payments',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'accounting',
    name: 'Accounting',
    description: 'Chart of accounts, journal entries, and financial statements',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'treasury',
    name: 'Treasury',
    description: 'Bank accounts, reconciliation, payment batches, and cash flow',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Salary structures, payroll runs, payslips, and tax calculation',
    version: '0.0.0',
    dependencies: ['hr'],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Contacts, companies, pipeline stages, opportunities, and activities',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management, tasks, time tracking, and project budgets',
    version: '0.0.0',
    dependencies: [],
    permissions: [],
    roles: [],
    navigation: [],
  },
];

for (const mod of plannedModules) {
  moduleRegistry.register({
    ...mod,
    dashboardWidgets: [],
    workflows: [],
    reports: [],
  });
}
