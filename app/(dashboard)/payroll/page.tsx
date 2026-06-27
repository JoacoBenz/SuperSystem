'use client';
import { App, Card, Statistic, Row, Col, Table, Tag, Button } from 'antd';
import { DollarOutlined, TeamOutlined, CheckCircleOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  processing: 'processing',
  approved: 'success',
  paid: 'green',
};

interface RecentRun {
  id: number;
  period: string;
  name: string;
  status: string;
  totalNet: number;
  currency: string;
  employeeCount: number;
}

interface DashboardData {
  totalEmployees: number;
  runCount: number;
  totalPaidThisYear: number;
  byStatus: { draft: number; processing: number; approved: number; paid: number };
  recentRuns: RecentRun[];
}

export default function PayrollDashboardPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/payroll/dashboard');
      if (res.ok) setData(await res.json());
      else message.error('Failed to load payroll dashboard');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: 'Period', dataIndex: 'period', key: 'period', width: 100 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Employees', dataIndex: 'employeeCount', key: 'employeeCount', width: 100, align: 'right' as const },
    {
      title: 'Net Total',
      dataIndex: 'totalNet',
      key: 'totalNet',
      align: 'right' as const,
      render: (v: number, r: RecentRun) => `${r.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Payroll Dashboard</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => router.push('/payroll/runs')}>
            Payroll Runs
          </Button>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Active Employees" value={data?.totalEmployees ?? 0} prefix={<TeamOutlined />} styles={{ content: { color: '#1677ff' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Total Runs" value={data?.runCount ?? 0} prefix={<CalendarOutlined />} styles={{ content: { color: '#722ed1' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Paid This Year" value={data?.totalPaidThisYear ?? 0} prefix={<DollarOutlined />} precision={2} styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Pending Approval" value={(data?.byStatus.approved ?? 0) + (data?.byStatus.processing ?? 0)} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#fa8c16' } }} />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Payroll Runs">
        <Table
          loading={loading}
          dataSource={data?.recentRuns ?? []}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          onRow={r => ({ onClick: () => router.push(`/payroll/runs/${r.id}`), style: { cursor: 'pointer' } })}
        />
      </Card>
    </div>
  );
}
