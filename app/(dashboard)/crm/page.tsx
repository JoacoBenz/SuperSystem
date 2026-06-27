'use client';

import { Button, Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import {
  BankOutlined,
  DollarOutlined,
  RiseOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

const STAGE_COLORS: Record<string, string> = {
  lead: 'default',
  qualified: 'processing',
  proposal: 'warning',
  negotiation: 'orange',
  won: 'success',
  lost: 'error',
};

export default function CrmDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/crm/dashboard');
      const json = await res.json();
      setStats(json);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stageTableData = stats?.byStage
    ? Object.entries(stats.byStage as Record<string, { count: number; value: number }>).map(
        ([stage, info]) => ({ stage, ...info }),
      )
    : [];

  const stageColumns = [
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (s: string) => (
        <Tag color={STAGE_COLORS[s] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {s}
        </Tag>
      ),
    },
    { title: 'Count', dataIndex: 'count', key: 'count' },
    {
      title: 'Total Value',
      dataIndex: 'value',
      key: 'value',
      render: (v: number) =>
        v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
  ];

  const recentColumns = [
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Company',
      key: 'company',
      render: (_: any, record: any) => record.company?.name ?? '-',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (s: string) => (
        <Tag color={STAGE_COLORS[s] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (v: number | null) =>
        v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            CRM Dashboard
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<RiseOutlined />} onClick={() => router.push('/crm/opportunities')}>
            New Opportunity
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/crm/contacts')}>
            <Statistic
              title="Total Contacts"
              value={stats?.totalContacts ?? 0}
              prefix={<TeamOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/crm/companies')}>
            <Statistic
              title="Total Companies"
              value={stats?.totalCompanies ?? 0}
              prefix={<BankOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/crm/opportunities')}>
            <Statistic
              title="Open Opportunities"
              value={stats?.totalOpportunities ?? 0}
              prefix={<RiseOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/crm/opportunities')}>
            <Statistic
              title="Pipeline Value"
              value={stats?.openPipelineValue ?? 0}
              prefix={<DollarOutlined />}
              precision={2}
              loading={loading}
              formatter={(v) =>
                `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Pipeline by Stage" styles={{ body: { padding: 0 } }}>
            <Table
              columns={stageColumns}
              dataSource={stageTableData}
              rowKey="stage"
              loading={loading}
              pagination={false}
              size="small"
              onRow={() => ({
                onClick: () => router.push('/crm/opportunities'),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Recent Opportunities" styles={{ body: { padding: 0 } }}>
            <Table
              columns={recentColumns}
              dataSource={stats?.recentOpportunities ?? []}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => router.push('/crm/opportunities'),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
