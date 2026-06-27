export const FINANCE_PERMISSIONS = [
  { resource: 'budget', action: 'read', description: 'View budgets' },
  { resource: 'budget', action: 'manage', description: 'Create and edit budgets' },
  { resource: 'payment', action: 'read', description: 'View payment schedule' },
  { resource: 'payment', action: 'schedule', description: 'Schedule payments' },
  { resource: 'report', action: 'read', description: 'View financial reports' },
] as const;

export const FINANCE_ROLE_PERMISSIONS: Record<string, string[]> = {
  treasurer: [
    'finance.budget.read',
    'finance.budget.manage',
    'finance.payment.read',
    'finance.payment.schedule',
    'finance.report.read',
  ],
  finance_viewer: [
    'finance.budget.read',
    'finance.payment.read',
    'finance.report.read',
  ],
};
