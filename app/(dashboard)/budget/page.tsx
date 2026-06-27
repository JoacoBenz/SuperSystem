'use client';

import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  active: 'success',
  closed: 'warning',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function BudgetOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/budget/overview')
      .then((r) => r.json())
      .then((json) => setData(json.data ?? json))
      .finally(() => setLoading(false));
  }, []);

  const recentColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Fiscal Year', dataIndex: 'fiscalYear', key: 'fiscalYear', width: 110 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s] ?? 'default'}>{s.charAt(0).toUpperCase() + s.slice(1)}</Tag>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      render: (v: number) => fmt(v),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Budget Overview
        </Title>
        <SoonWithAI
          feature="Variance Insights"
          description="Explains in plain English why each line is over or under budget and forecasts year-end variance so you can act before money runs out."
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Budgets" value={data?.totalBudgets ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Active Budgets" value={data?.activeBudgets ?? 0} loading={loading} styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Planned"
              value={data?.totalPlanned ?? 0}
              loading={loading}
              formatter={(v) => fmt(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Actual"
              value={data?.totalActual ?? 0}
              loading={loading}
              formatter={(v) => fmt(Number(v))}
              styles={
                data && data.totalActual > data.totalPlanned
                  ? { content: { color: '#ff4d4f' } }
                  : undefined
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Budgets">
        <Table
          columns={recentColumns}
          dataSource={data?.recentBudgets ?? []}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
