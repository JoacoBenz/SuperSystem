'use client';

import { Layout, Menu, Spin } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  DashboardOutlined,
  SettingOutlined,
  UserOutlined,
  ApartmentOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  ShopOutlined,
  BankOutlined,
  PlusCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  EditOutlined,
  ScheduleOutlined,
  FundOutlined,
  IdcardOutlined,
  CalendarOutlined,
  DollarOutlined,
  RiseOutlined,
  FolderOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  ProfileOutlined,
  UnorderedListOutlined,
  AccountBookOutlined,
  TransactionOutlined,
  CalculatorOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { NavigationItem } from '@/src/core/modules/types';

const { Sider } = Layout;

const ICON_MAP: Record<string, React.ReactNode> = {
  PlusCircleOutlined: <PlusCircleOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  AuditOutlined: <AuditOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  InboxOutlined: <InboxOutlined />,
  ShopOutlined: <ShopOutlined />,
  BankOutlined: <BankOutlined />,
};

const MODULE_LABELS: Record<string, string> = {
  procurement: 'Procurement',
  inventory: 'Inventory',
  sales: 'Sales',
  accounting: 'Accounting',
  hr: 'HR',
  payroll: 'Payroll',
  treasury: 'Treasury',
  budget: 'Budget',
  crm: 'CRM',
  projects: 'Projects',
};

interface SidebarProps {
  collapsed: boolean;
  orgRole: string;
}

export function Sidebar({ collapsed, orgRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moduleItems, setModuleItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/core/modules?type=navigation')
      .then(res => res.json())
      .then(data => {
        setModuleItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const coreItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  ];

  // Super admin: platform management only, no module operations
  // Admin: tenant administration + module navigation
  // Member: module navigation only

  const adminChildren = [
    { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
    { key: '/admin/departments', icon: <ApartmentOutlined />, label: 'Departments' },
    { key: '/admin/roles', icon: <SafetyOutlined />, label: 'Roles' },
    { key: '/admin/delegations', icon: <TeamOutlined />, label: 'Delegations' },
    { key: '/admin/modules', icon: <AppstoreOutlined />, label: 'Modules' },
    { key: '/admin/sso', icon: <SettingOutlined />, label: 'SSO Settings' },
  ];

  const superAdminItems = orgRole === 'super_admin' ? [
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: 'Platform',
      children: [
        { key: '/admin/tenants', icon: <AppstoreOutlined />, label: 'Tenants' },
        ...adminChildren,
      ],
    },
    { key: '/admin/audit', icon: <FileSearchOutlined />, label: 'Audit Log' },
  ] : [];

  const adminItems = orgRole === 'admin' ? [
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: 'Administration',
      children: adminChildren,
    },
    { key: '/admin/audit', icon: <FileSearchOutlined />, label: 'Audit Log' },
  ] : [];

  // Module navigation: only for admin and member, NOT for super_admin
  const dynamicItems: typeof coreItems = [];
  if (orgRole !== 'super_admin') {
    const groupedModules = new Map<string, typeof moduleItems>();
    for (const item of moduleItems) {
      const modulePath = item.key.split('/')[1];
      if (!groupedModules.has(modulePath)) groupedModules.set(modulePath, []);
      groupedModules.get(modulePath)!.push(item);
    }

    for (const [modulePath, items] of groupedModules) {
      // Skip modules that are hardcoded in the sidebar
      if (['inventory', 'finance', 'hr', 'payroll', 'sales', 'crm', 'projects', 'budget', 'treasury', 'accounting'].includes(modulePath)) continue;
      dynamicItems.push({
        key: `/${modulePath}`,
        icon: ICON_MAP[items[0]?.icon] || <AppstoreOutlined />,
        label: MODULE_LABELS[modulePath] ?? modulePath,
        children: items.map(item => ({
          key: item.key,
          icon: ICON_MAP[item.icon] || <AppstoreOutlined />,
          label: item.label,
        })),
      } as any);
    }
  }

  const inventoryChildren = [
    { key: '/inventory', icon: <BarChartOutlined />, label: 'Stock Levels' },
    { key: '/inventory/entries', icon: <InboxOutlined />, label: 'Reception History' },
    { key: '/inventory/adjustments', icon: <EditOutlined />, label: 'Adjustments' },
  ];

  const inventoryItem = {
    key: 'inventory',
    icon: <DatabaseOutlined />,
    label: 'Inventory',
    children: inventoryChildren,
  };

  const financeChildren = [
    { key: '/finance', icon: <FundOutlined />, label: 'Dashboard' },
    { key: '/finance/payment-queue', icon: <ScheduleOutlined />, label: 'Payment Queue' },
    { key: '/finance/budgets', icon: <BankOutlined />, label: 'Budgets' },
  ];

  const financeItem = {
    key: 'finance',
    icon: <BankOutlined />,
    label: 'Finance',
    children: financeChildren,
  };

  const hrChildren = [
    { key: '/hr', icon: <FundOutlined />, label: 'Dashboard' },
    { key: '/hr/employees', icon: <TeamOutlined />, label: 'Employees' },
  ];

  const hrItem = {
    key: 'hr',
    icon: <IdcardOutlined />,
    label: 'Human Resources',
    children: hrChildren,
  };

  const payrollItem = {
    key: 'payroll',
    icon: <DollarOutlined />,
    label: 'Payroll',
    children: [
      { key: '/payroll', icon: <FundOutlined />, label: 'Dashboard' },
      { key: '/payroll/runs', icon: <CalendarOutlined />, label: 'Payroll Runs' },
    ],
  };

  const salesItem = {
    key: 'sales',
    icon: <ShopOutlined />,
    label: 'Sales',
    children: [
      { key: '/sales', icon: <FundOutlined />, label: 'Dashboard' },
      { key: '/sales/orders', icon: <FileTextOutlined />, label: 'Orders' },
      { key: '/sales/customers', icon: <TeamOutlined />, label: 'Customers' },
    ],
  };

  const crmItem = {
    key: 'crm',
    icon: <RiseOutlined />,
    label: 'CRM',
    children: [
      { key: '/crm', icon: <FundOutlined />, label: 'Dashboard' },
      { key: '/crm/companies', icon: <BankOutlined />, label: 'Companies' },
      { key: '/crm/contacts', icon: <TeamOutlined />, label: 'Contacts' },
      { key: '/crm/opportunities', icon: <RiseOutlined />, label: 'Opportunities' },
    ],
  };

  const projectsItem = {
    key: 'projects',
    icon: <FolderOutlined />,
    label: 'Projects',
    children: [
      { key: '/projects', icon: <FolderOutlined />, label: 'Projects' },
      { key: '/projects/tasks', icon: <CheckSquareOutlined />, label: 'My Tasks' },
      { key: '/projects/time', icon: <ClockCircleOutlined />, label: 'Time Tracking' },
    ],
  };

  const accountingItem = {
    key: 'accounting',
    icon: <CalculatorOutlined />,
    label: 'Accounting',
    children: [
      { key: '/accounting', icon: <FundOutlined />, label: 'Dashboard' },
      { key: '/accounting/accounts', icon: <ApartmentOutlined />, label: 'Chart of Accounts' },
      { key: '/accounting/journals', icon: <BookOutlined />, label: 'Journal Entries' },
      { key: '/accounting/statements', icon: <FileTextOutlined />, label: 'Statements' },
    ],
  };

  const treasuryItem = {
    key: 'treasury',
    icon: <AccountBookOutlined />,
    label: 'Treasury',
    children: [
      { key: '/treasury', icon: <FundOutlined />, label: 'Dashboard' },
      { key: '/treasury/accounts', icon: <BankOutlined />, label: 'Bank Accounts' },
      { key: '/treasury/transactions', icon: <TransactionOutlined />, label: 'Transactions' },
    ],
  };

  const budgetItem = {
    key: 'budget',
    icon: <WalletOutlined />,
    label: 'Budget',
    children: [
      { key: '/budget', icon: <FundOutlined />, label: 'Overview' },
      { key: '/budget/list', icon: <ProfileOutlined />, label: 'Budgets' },
      { key: '/budget/items', icon: <UnorderedListOutlined />, label: 'Line Items' },
    ],
  };

  const menuItems = [...coreItems, inventoryItem, financeItem, accountingItem, treasuryItem, budgetItem, hrItem, payrollItem, salesItem, crmItem, projectsItem, ...dynamicItems, ...superAdminItems, ...adminItems];

  // Find the open submenu key based on current path
  const openKey = '/' + (pathname.split('/')[1] ?? '');

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={236}
      style={{
        background: '#16181d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'fixed',
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          height: 60,
          padding: collapsed ? 0 : '0 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          marginBottom: 6,
          position: 'sticky',
          top: 0,
          background: '#16181d',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 9,
            background: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
          }}
        >
          EP
        </div>
        {!collapsed && (
          <span className="brand-word" style={{ color: '#fff', fontWeight: 600, fontSize: 17, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
            ERP Platform
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
      ) : (
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={[openKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ background: 'transparent', borderInlineEnd: 'none', paddingBottom: 16 }}
        />
      )}
    </Sider>
  );
}
