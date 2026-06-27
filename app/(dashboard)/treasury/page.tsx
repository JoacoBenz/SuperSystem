'use client';

import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

const { Title } = Typography;

export default function TreasuryDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/treasury/dashboard');
      const json = await res.json();
      setStats(json);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recentColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      ellipsis: true,
      render: (v: string | null) => v ?? '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v: number, record: any) => (
        <span style={{ color: record.type === 'credit' ? '#52c41a' : '#ff4d4f' }}>
          {record.type === 'debit' ? '-' : '+'}${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (t: string) => (
        <Tag color={t === 'credit' ? 'success' : 'error'} style={{ textTransform: 'capitalize' }}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Reconciled',
      dataIndex: 'reconciled',
      key: 'reconciled',
      width: 110,
      render: (r: boolean) => (
        <Tag color={r ? 'success' : 'warning'}>{r ? 'Reconciled' : 'Pending'}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              Treasury Dashboard
            </Title>
            <SoonWithAI
              feature="Cash-Flow Forecasting"
              description="Forecasts your cash position weeks ahead from receivables, payables, and recurring flows, and auto-matches transactions for one-click reconciliation."
            />
          </span>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/treasury/accounts')}>
            <Statistic
              title="Total Accounts"
              value={stats?.totalAccounts ?? 0}
              prefix={<BankOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/treasury/accounts')}>
            <Statistic
              title="Total Balance"
              value={stats?.totalBalance ?? 0}
              prefix={<DollarOutlined />}
              precision={2}
              loading={loading}
              formatter={(v) =>
                `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/treasury/transactions')}>
            <Statistic
              title="Reconciled (This Month)"
              value={stats?.reconciledCount ?? 0}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dash-tile" onClick={() => router.push('/treasury/transactions')}>
            <Statistic
              title="Pending Reconciliation"
              value={stats?.pendingCount ?? 0}
              prefix={<ClockCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Transactions" styles={{ body: { padding: 0 } }}>
        <Table
          columns={recentColumns}
          dataSource={stats?.recentTransactions ?? []}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          onRow={() => ({
            onClick: () => router.push('/treasury/transactions'),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}
