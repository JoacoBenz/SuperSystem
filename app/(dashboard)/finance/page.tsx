'use client';
import { App, Card, Statistic, Row, Col, Space, Button } from 'antd';
import { DollarOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface FinanceDashboard {
  totalPRs: number;
  totalSpent: number;
  pendingPayments: number;
  scheduledPayments: number;
  thisMonthSpent: number;
  budgetCount: number;
}

export default function FinancePage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/finance/dashboard');
      if (res.ok) setData(await res.json());
      else message.error('Failed to load financial dashboard');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Finance Dashboard</h2>
        <Space>
          <Button onClick={() => router.push('/finance/payment-queue')}>Payment Queue</Button>
          <Button type="primary" onClick={() => router.push('/finance/budgets')}>Manage Budgets</Button>
          <Button onClick={fetchData}>Refresh</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Spent (All Time)"
              value={data?.totalSpent ?? 0}
              prefix={<DollarOutlined />}
              precision={2}
              formatter={(v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="This Month Spent"
              value={data?.thisMonthSpent ?? 0}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: '#1677ff' } }}
              formatter={(v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Pending Payments"
              value={data?.pendingPayments ?? 0}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: data?.pendingPayments ? '#fa8c16' : undefined } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Scheduled Payments"
              value={data?.scheduledPayments ?? 0}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Quick Actions">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block onClick={() => router.push('/finance/payment-queue')}>
                View Payment Queue ({data?.pendingPayments ?? 0} pending)
              </Button>
              <Button block onClick={() => router.push('/finance/budgets')}>
                View Budgets ({data?.budgetCount ?? 0} configured)
              </Button>
              <Button block onClick={() => router.push('/procurement/requests')}>
                Go to Procurement
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Summary">
            <p>Total Purchase Requests: <strong>{data?.totalPRs ?? 0}</strong></p>
            <p>Total Amount Spent: <strong>${(data?.totalSpent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
            <p>Pending Payment Approvals: <strong>{data?.pendingPayments ?? 0}</strong></p>
            <p>Configured Budgets: <strong>{data?.budgetCount ?? 0}</strong></p>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
