import type { NavigationItem } from '@/src/core/modules/types';

export const crmNavigation: NavigationItem[] = [
  {
    key: '/crm',
    label: 'Dashboard',
    icon: 'FundOutlined',
    requiredPermissions: ['crm.dashboard.read'],
  },
  {
    key: '/crm/companies',
    label: 'Companies',
    icon: 'BankOutlined',
    requiredPermissions: ['crm.company.read'],
  },
  {
    key: '/crm/contacts',
    label: 'Contacts',
    icon: 'TeamOutlined',
    requiredPermissions: ['crm.contact.read'],
  },
  {
    key: '/crm/opportunities',
    label: 'Opportunities',
    icon: 'RiseOutlined',
    requiredPermissions: ['crm.opportunity.read'],
  },
  {
    key: '/crm/partners',
    label: 'Partners',
    icon: 'IdcardOutlined',
    requiredPermissions: ['crm.partner.read'],
  },
];
