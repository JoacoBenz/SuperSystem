'use client';

import { Typography, Row, Col, Card, Table, Tag, Spin, Statistic } from 'antd';
import { StatCard } from '@/components/ui/StatCard';
import { SoonWithAI } from '@/components/ui/SoonWithAI';
import { useEffect, useState } from 'react';
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

export function DashboardContent({ orgRole, permissions }: DashboardContentProps) {
  const [platformStats, setPlatformStats] = useState<{ tenants: any[] } | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgRole === 'super_admin') {
      // Super admin: load platform overview
      fetch('/api/v1/core/tenants')
        .then(r => r.json())
        .then(data => {
          const tenants = Array.isArray(data) ? data : data.data ?? [];
          setPlatformStats({ tenants });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // Regular users: load cross-module business overview
      fetch('/api/v1/core/overview')
        .then(r => r.json())
        .then((data: Overview) => setOverview(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [orgRole]);

  // Super admin: platform overview dashboard
  if (orgRole === 'super_admin') {
    const tenants = platformStats?.tenants ?? [];
    const totalUsers = tenants.reduce((sum: number, t: any) => sum + (t._count?.users ?? 0), 0);
    const totalModules = tenants.reduce((sum: number, t: any) => sum + (t.tenantModules?.length ?? 0), 0);

    return (
      <div>
        <Title level={3}>Platform Overview</Title>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <StatCard
              title="Tenants"
              value={tenants.length}
              prefix={<ClusterOutlined />}
              loading={loading}
              color="#1677ff"
            />
          </Col>
          <Col xs={24} sm={8}>
            <StatCard
              title="Total Users"
              value={totalUsers}
              prefix={<TeamOutlined />}
              loading={loading}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={8}>
            <StatCard
              title="Active Modules"
              value={totalModules}
              prefix={<AppstoreOutlined />}
              loading={loading}
              color="#722ed1"
            />
          </Col>
        </Row>

        <Card title="Tenants" style={{ marginTop: 24 }}>
          {loading ? <Spin /> : (
            <Table
              dataSource={tenants}
              rowKey="id"
              size="small"
              pagination={false}
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

  // Regular users: unified cross-module business overview
  const o = overview;

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
        Key numbers from across your business, in one place.
      </Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Open Purchase Requests"
              value={o?.procurement.openPurchaseRequests ?? 0}
              prefix={<FileTextOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Low-Stock Items"
              value={o?.inventory.lowStockItems ?? 0}
              prefix={<WarningOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Sales Orders"
              value={o?.sales.orders ?? 0}
              prefix={<ShoppingCartOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Confirmed Revenue"
              value={money(o?.sales.confirmedRevenue ?? 0)}
              prefix={<DollarOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Open Pipeline Value"
              value={money(o?.crm.openPipelineValue ?? 0)}
              prefix={<FundOutlined />}
              styles={{ content: { color: '#13c2c2' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Active Projects"
              value={o?.projects.activeProjects ?? 0}
              prefix={<ProjectOutlined />}
              styles={{ content: { color: '#2f54eb' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Open Tasks"
              value={o?.projects.openTasks ?? 0}
              prefix={<CheckSquareOutlined />}
              styles={{ content: { color: '#eb2f96' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Treasury Balance"
              value={money(o?.treasury.totalBalance ?? 0)}
              prefix={<WalletOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Assets"
              value={money(o?.accounting.totalAssets ?? 0)}
              prefix={<RiseOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Liabilities"
              value={money(o?.accounting.totalLiabilities ?? 0)}
              prefix={<FallOutlined />}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Budget Planned"
              value={money(o?.budget.totalPlanned ?? 0)}
              prefix={<BankOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Budget Actual"
              value={money(o?.budget.totalActual ?? 0)}
              prefix={<BankOutlined />}
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Employees"
              value={o?.hr.employeeCount ?? 0}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      {orgRole === 'admin' && (
        <Card style={{ marginTop: 24 }}>
          <Title level={5}>Administration</Title>
          <p>Welcome, administrator. Use the sidebar to manage users, departments, roles, and modules.</p>
        </Card>
      )}
    </div>
  );
}
