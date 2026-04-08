'use client';

import { Layout, Menu, Spin, Badge } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTenantSwitcher } from '@/components/providers/TenantSwitcher';
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
  const { tenantParam } = useTenantSwitcher();
  const [moduleItems, setModuleItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const tp = tenantParam ? `&${tenantParam}` : '';
    fetch(`/api/v1/core/modules?type=navigation${tp}`)
      .then(res => res.json())
      .then(data => {
        const items: NavigationItem[] = Array.isArray(data) ? data : [];
        setModuleItems(items);
        setLoading(false);

        // Fetch badge counts for items that have badge endpoints
        const badgeItems = items.filter(i => i.badge?.countEndpoint);
        if (badgeItems.length > 0) {
          Promise.all(
            badgeItems.map(async (item) => {
              try {
                const res = await fetch(item.badge!.countEndpoint);
                if (res.ok) {
                  const json = await res.json();
                  const count = json.count ?? json.total ?? 0;
                  return { key: item.key, count };
                }
              } catch {}
              return { key: item.key, count: 0 };
            })
          ).then(results => {
            const counts: Record<string, number> = {};
            for (const r of results) {
              if (r.count > 0) counts[r.key] = r.count;
            }
            setBadgeCounts(counts);
          });
        }
      })
      .catch(() => setLoading(false));
  }, [tenantParam]);

  // Refresh badge counts periodically
  useEffect(() => {
    if (moduleItems.length === 0) return;
    const interval = setInterval(() => {
      const badgeItems = moduleItems.filter(i => i.badge?.countEndpoint);
      if (badgeItems.length === 0) return;
      Promise.all(
        badgeItems.map(async (item) => {
          try {
            const res = await fetch(item.badge!.countEndpoint);
            if (res.ok) {
              const json = await res.json();
              return { key: item.key, count: json.count ?? json.total ?? 0 };
            }
          } catch {}
          return { key: item.key, count: 0 };
        })
      ).then(results => {
        const counts: Record<string, number> = {};
        for (const r of results) {
          if (r.count > 0) counts[r.key] = r.count;
        }
        setBadgeCounts(counts);
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [moduleItems]);

  const coreItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  ];

  const adminChildren = [
    { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
    { key: '/admin/departments', icon: <ApartmentOutlined />, label: 'Departments' },
    { key: '/admin/roles', icon: <SafetyOutlined />, label: 'Roles' },
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

  // Module navigation: show for all roles
  const dynamicItems: typeof coreItems = [];
  {
    const groupedModules = new Map<string, typeof moduleItems>();
    for (const item of moduleItems) {
      const modulePath = item.key.split('/')[1];
      if (!groupedModules.has(modulePath)) groupedModules.set(modulePath, []);
      groupedModules.get(modulePath)!.push(item);
    }

    for (const [modulePath, items] of groupedModules) {
      dynamicItems.push({
        key: `/${modulePath}`,
        icon: ICON_MAP[items[0]?.icon] || <AppstoreOutlined />,
        label: MODULE_LABELS[modulePath] ?? modulePath,
        children: items.map(item => {
          const count = badgeCounts[item.key];
          return {
            key: item.key,
            icon: ICON_MAP[item.icon] || <AppstoreOutlined />,
            label: count ? (
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.label}
                <Badge count={count} size="small" style={{ marginLeft: 8 }} />
              </span>
            ) : item.label,
          };
        }),
      } as any);
    }
  }

  const menuItems = [...coreItems, ...dynamicItems, ...superAdminItems, ...adminItems];

  const openKey = '/' + (pathname.split('/')[1] ?? '');

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      style={{ minHeight: '100vh' }}
    >
      <div style={{ height: 32, margin: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: collapsed ? 14 : 18 }}>
        {collapsed ? 'ERP' : 'ERP Platform'}
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
        />
      )}
    </Sider>
  );
}
