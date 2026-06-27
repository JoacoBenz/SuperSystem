'use client';

import { App, Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  posted: 'success',
  void: 'error',
};

export default function AccountingDashboardPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/accounting/dashboard');
        const json = await res.json();
        setData(json.data ?? json);
      } catch {
        message.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [message]);

  const columns = [
    { title: 'Entry #', dataIndex: 'entryNumber', key: 'entryNumber', width: 120 },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusColors[s] ?? 'default'}>{s}</Tag>,
    },
    { title: 'Lines', dataIndex: 'lineCount', key: 'lineCount', width: 80 },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Accounting Dashboard
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="Total Accounts" value={data?.totalAccounts ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Assets"
              value={data?.totalAssets ?? 0}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Liabilities"
              value={data?.totalLiabilities ?? 0}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Equity"
              value={data?.totalEquity ?? 0}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card loading={loading}>
            <Statistic title="Draft Journals" value={data?.draftJournals ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card loading={loading}>
            <Statistic title="Posted Journals" value={data?.postedJournals ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Journal Entries" loading={loading}>
        <Table
          columns={columns}
          dataSource={data?.recentJournals ?? []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
