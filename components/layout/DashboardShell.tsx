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
      <Layout>
        <Header
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          userName={userName}
          orgRole={orgRole}
        />
        <TenantSwitcherProvider orgRole={orgRole}>
          <Content style={{ margin: 24, padding: 24, minHeight: 280 }}>
            {children}
          </Content>
        </TenantSwitcherProvider>
      </Layout>
    </Layout>
  );
}
