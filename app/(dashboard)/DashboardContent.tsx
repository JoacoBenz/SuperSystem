'use client';

import { Typography, Row, Col, Card, Statistic, Table, Tag, Spin } from 'antd';
import { StatCard } from '@/components/ui/StatCard';
import { useEffect, useState } from 'react';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ClusterOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

interface DashboardContentProps {
  orgRole: string;
  permissions: string[];
}

export function DashboardContent({ orgRole, permissions }: DashboardContentProps) {
  const [stats, setStats] = useState({
    myRequests: 0,
    pendingApprovals: 0,
    pendingValidations: 0,
    inProcurement: 0,
  });
  const [platformStats, setPlatformStats] = useState<{ tenants: any[] } | null>(null);
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
      // Regular users: load procurement stats
      async function fetchStats() {
        try {
          const fetchCount = async (status: string) => {
            const res = await fetch(`/api/v1/procurement/purchase-requests?status=${status}&count_only=true`);
            const data = await res.json();
            return data.count ?? 0;
          };

          const [submitted, validated, inProc] = await Promise.all([
            fetchCount('submitted'),
            fetchCount('validated'),
            fetchCount('in_procurement'),
          ]);

          setStats({
            myRequests: submitted + validated + inProc,
            pendingApprovals: validated,
            pendingValidations: submitted,
            inProcurement: inProc,
          });
        } catch {} finally {
          setLoading(false);
        }
      }
      fetchStats();
    }
  }, [orgRole]);

  const hasPermission = (p: string) => permissions.includes(p);

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

  // Regular users: module-specific dashboard
  return (
    <div>
      <Title level={3}>Dashboard</Title>
      <Row gutter={[16, 16]}>
        {hasPermission('procurement.purchase_request.read_own') && (
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Active Requests"
              value={stats.myRequests}
              prefix={<FileTextOutlined />}
              loading={loading}
              color="#1677ff"
            />
          </Col>
        )}
        {hasPermission('procurement.purchase_request.validate') && (
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Pending Validations"
              value={stats.pendingValidations}
              prefix={<CheckCircleOutlined />}
              loading={loading}
              color="#faad14"
            />
          </Col>
        )}
        {hasPermission('procurement.purchase_request.approve') && (
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Pending Approvals"
              value={stats.pendingApprovals}
              prefix={<CheckCircleOutlined />}
              loading={loading}
              color="#52c41a"
            />
          </Col>
        )}
        {hasPermission('procurement.purchase_request.process') && (
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="In Procurement"
              value={stats.inProcurement}
              prefix={<ShoppingCartOutlined />}
              loading={loading}
              color="#722ed1"
            />
          </Col>
        )}
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
