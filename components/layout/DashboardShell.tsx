'use client';

import { Layout } from 'antd';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TenantSwitcherProvider } from '@/components/providers/TenantSwitcher';

const { Content } = Layout;

interface DashboardShellProps {
  userName: string;
  orgRole: string;
  children: React.ReactNode;
}

export function DashboardShell({ userName, orgRole, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} orgRole={orgRole} />
      <Layout style={{ marginInlineStart: collapsed ? 80 : 236, transition: 'margin-inline-start 0.2s ease' }}>
        <Header
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          userName={userName}
          orgRole={orgRole}
        />
        <TenantSwitcherProvider orgRole={orgRole}>
          <Content style={{ padding: '24px 28px', minHeight: 280 }}>
            <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
              {children}
            </div>
          </Content>
        </TenantSwitcherProvider>
      </Layout>
    </Layout>
  );
}
