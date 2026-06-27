'use client';
import { App, Card, Statistic, Row, Col, Table, Tag, Button } from 'antd';
import { TeamOutlined, FileTextOutlined, DollarOutlined, RiseOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  confirmed: 'processing',
  shipped: 'warning',
  delivered: 'success',
  cancelled: 'error',
};

interface RecentOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  customer: { name: string };
  createdAt: string;
}

interface DashboardData {
  totalCustomers: number;
  totalOrders: number;
  confirmedRevenue: number;
  byStatus: Record<string, { count: number; total: number }>;
  recentOrders: RecentOrder[];
}

export default function SalesDashboardPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/sales/dashboard');
      if (res.ok) setData(await res.json());
      else message.error('Failed to load sales dashboard');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: 'Order #', dataIndex: 'orderNumber', width: 110 },
    { title: 'Customer', key: 'customer', render: (_: unknown, o: RecentOrder) => o.customer?.name },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      align: 'right' as const,
      render: (v: number, o: RecentOrder) => `${o.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
  ];

  const openCount = (data?.byStatus?.confirmed?.count ?? 0) + (data?.byStatus?.shipped?.count ?? 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Sales Dashboard</h2>
          <SoonWithAI
            feature="Sales Forecasting"
            description="Projects next-quarter revenue from order history and seasonality with confidence ranges, and flags customers at risk of churning."
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/sales/orders')}>
            New Order
          </Button>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Customers" value={data?.totalCustomers ?? 0} prefix={<TeamOutlined />} styles={{ content: { color: '#1677ff' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Total Orders" value={data?.totalOrders ?? 0} prefix={<FileTextOutlined />} styles={{ content: { color: '#722ed1' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Confirmed Revenue" value={data?.confirmedRevenue ?? 0} prefix={<DollarOutlined />} precision={2} styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="Open Orders" value={openCount} prefix={<RiseOutlined />} styles={{ content: { color: '#fa8c16' } }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="Recent Orders">
            <Table
              loading={loading}
              dataSource={data?.recentOrders ?? []}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={false}
              onRow={o => ({ onClick: () => router.push(`/sales/orders`), style: { cursor: 'pointer' } })}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="By Status" loading={loading}>
            {['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Tag color={STATUS_COLOR[s]}>{s.toUpperCase()}</Tag>
                <span>{data?.byStatus?.[s]?.count ?? 0} orders</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
