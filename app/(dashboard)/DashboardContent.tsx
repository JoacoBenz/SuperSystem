'use client';

import { Typography, Row, Col, Card, Table, Tag, Spin, Statistic } from 'antd';
import { StatCard } from '@/components/ui/StatCard';
import { SoonWithAI } from '@/components/ui/SoonWithAI';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileTextOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ClusterOutlined,
  AppstoreOutlined,
  DollarOutlined,
  WarningOutlined,
  FundOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  BankOutlined,
  RiseOutlined,
  FallOutlined,
  WalletOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface DashboardContentProps {
  orgRole: string;
  permissions: string[];
}

interface Overview {
  procurement: { openPurchaseRequests: number };
  inventory: { lowStockItems: number };
  sales: { orders: number; confirmedRevenue: number };
  crm: { openPipelineValue: number };
  projects: { activeProjects: number; openTasks: number };
  treasury: { totalBalance: number };
  accounting: { totalAssets: number; totalLiabilities: number };
  budget: { totalPlanned: number; totalActual: number };
  hr: { employeeCount: number };
}

const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export function DashboardContent({ orgRole }: DashboardContentProps) {
  const router = useRouter();
  const [platformStats, setPlatformStats] = useState<{ tenants: any[] } | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgRole === 'super_admin') {
      fetch('/api/v1/core/tenants')
        .then(r => r.json())
        .then(data => {
          const tenants = Array.isArray(data) ? data : data.data ?? [];
          setPlatformStats({ tenants });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch('/api/v1/core/overview')
        .then(r => r.json())
        .then((data: Overview) => setOverview(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [orgRole]);

  // ── Super admin: platform overview dashboard ──────────────────────────────
  if (orgRole === 'super_admin') {
    const tenants = platformStats?.tenants ?? [];
    const totalUsers = tenants.reduce((sum: number, t: any) => sum + (t._count?.users ?? 0), 0);
    const totalModules = tenants.reduce((sum: number, t: any) => sum + (t.tenantModules?.length ?? 0), 0);

    const platformTiles = [
      { title: 'Tenants', value: tenants.length, prefix: <ClusterOutlined />, color: '#1677ff', href: '/admin/tenants' },
      { title: 'Total Users', value: totalUsers, prefix: <TeamOutlined />, color: '#52c41a', href: '/admin/users' },
      { title: 'Active Modules', value: totalModules, prefix: <AppstoreOutlined />, color: '#722ed1', href: '/admin/modules' },
    ];

    return (
      <div>
        <Title level={3}>Platform Overview</Title>

        <Row gutter={[16, 16]}>
          {platformTiles.map(t => (
            <Col xs={24} sm={8} key={t.title}>
              <div className="dash-tile" onClick={() => router.push(t.href)}>
                <StatCard title={t.title} value={t.value} prefix={t.prefix} loading={loading} color={t.color} />
              </div>
            </Col>
          ))}
        </Row>

        <Card title="Tenants" style={{ marginTop: 24 }}>
          {loading ? <Spin /> : (
            <Table
              dataSource={tenants}
              rowKey="id"
              size="small"
              pagination={false}
              onRow={() => ({ onClick: () => router.push('/admin/tenants'), style: { cursor: 'pointer' } })}
              columns={[
                { title: 'Name', dataIndex: 'name', key: 'name' },
                { title: 'Slug', dataIndex: 'slug', key: 'slug' },
                {
                  title: 'Status', dataIndex: 'status', key: 'status', width: 90,
                  render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s}</Tag>,
                },
                { title: 'Users', key: 'users', width: 70, render: (_: any, r: any) => r._count?.users ?? 0 },
                {
                  title: 'Modules', key: 'modules',
                  render: (_: any, r: any) => r.tenantModules?.map((m: any) => (
                    <Tag key={m.moduleId} color="blue">{m.moduleId}</Tag>
                  )),
                },
                {
                  title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 110,
                  render: (d: string) => new Date(d).toLocaleDateString(),
                },
              ]}
            />
          )}
        </Card>
      </div>
    );
  }

  // ── Regular users: unified cross-module business overview ──────────────────
  const o = overview;

  const tiles = [
    { title: 'Open Purchase Requests', value: o?.procurement.openPurchaseRequests ?? 0, prefix: <FileTextOutlined />, color: '#1677ff', href: '/procurement/requests' },
    { title: 'Low-Stock Items', value: o?.inventory.lowStockItems ?? 0, prefix: <WarningOutlined />, color: '#faad14', href: '/inventory' },
    { title: 'Sales Orders', value: o?.sales.orders ?? 0, prefix: <ShoppingCartOutlined />, color: '#722ed1', href: '/sales/orders' },
    { title: 'Confirmed Revenue', value: money(o?.sales.confirmedRevenue ?? 0), prefix: <DollarOutlined />, color: '#52c41a', href: '/sales' },
    { title: 'Open Pipeline Value', value: money(o?.crm.openPipelineValue ?? 0), prefix: <FundOutlined />, color: '#13c2c2', href: '/crm/opportunities' },
    { title: 'Active Projects', value: o?.projects.activeProjects ?? 0, prefix: <ProjectOutlined />, color: '#2f54eb', href: '/projects' },
    { title: 'Open Tasks', value: o?.projects.openTasks ?? 0, prefix: <CheckSquareOutlined />, color: '#eb2f96', href: '/projects/tasks' },
    { title: 'Treasury Balance', value: money(o?.treasury.totalBalance ?? 0), prefix: <WalletOutlined />, color: '#52c41a', href: '/treasury' },
    { title: 'Total Assets', value: money(o?.accounting.totalAssets ?? 0), prefix: <RiseOutlined />, color: '#52c41a', href: '/accounting' },
    { title: 'Total Liabilities', value: money(o?.accounting.totalLiabilities ?? 0), prefix: <FallOutlined />, color: '#cf1322', href: '/accounting' },
    { title: 'Budget Planned', value: money(o?.budget.totalPlanned ?? 0), prefix: <BankOutlined />, color: '#1677ff', href: '/budget' },
    { title: 'Budget Actual', value: money(o?.budget.totalActual ?? 0), prefix: <BankOutlined />, color: '#fa8c16', href: '/budget/items' },
    { title: 'Employees', value: o?.hr.employeeCount ?? 0, prefix: <TeamOutlined />, color: '#722ed1', href: '/hr/employees' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.25em' }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
        <SoonWithAI
          feature="AI Copilot"
          description={'Ask in plain language — "top 5 customers by revenue this quarter" — and get instant answers, charts, and actions across every module.'}
        />
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Key numbers from across your business — click any tile to act.
      </Text>

      <Row gutter={[16, 16]}>
        {tiles.map(t => (
          <Col xs={24} sm={12} lg={6} key={t.title}>
            <Card loading={loading} className="dash-tile" onClick={() => router.push(t.href)}>
              <Statistic title={t.title} value={t.value} prefix={t.prefix} styles={{ content: { color: t.color } }} />
            </Card>
          </Col>
        ))}
      </Row>

      {orgRole === 'admin' && (
        <Card className="dash-tile" style={{ marginTop: 24 }} onClick={() => router.push('/admin/users')}>
          <Title level={5} style={{ marginTop: 0 }}>Administration</Title>
          <p style={{ margin: 0 }}>Manage users, departments, roles, and modules →</p>
        </Card>
      )}
    </div>
  );
}
