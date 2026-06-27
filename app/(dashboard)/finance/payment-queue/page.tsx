'use client';
import { App, Table, Tag, Button, Space, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface PaymentItem {
  id: number;
  number: string;
  title: string;
  status: string;
  estimatedTotal: number | null;
  scheduledPaymentDate: string | null;
  vendor: { id: number; name: string } | null;
  costCenter: { id: number; name: string } | null;
  itemCount: number;
  hasPO: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  in_procurement: 'blue',
  payment_scheduled: 'green',
};
const STATUS_LABELS: Record<string, string> = {
  in_procurement: 'In Procurement',
  payment_scheduled: 'Payment Scheduled',
};

export default function PaymentQueuePage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/finance/payment-queue');
      if (res.ok) setItems(await res.json());
      else message.error('Failed to load payment queue');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const columns: ColumnsType<PaymentItem> = [
    {
      title: 'PR Number',
      dataIndex: 'number',
      width: 120,
      render: (n: string, r) => (
        <a href={`/procurement/requests/${r.id}`}>{n}</a>
      ),
    },
    { title: 'Title', dataIndex: 'title' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s] ?? 'default'}>{STATUS_LABELS[s] ?? s}</Tag>
      ),
    },
    {
      title: 'Estimated Total',
      dataIndex: 'estimatedTotal',
      width: 130,
      align: 'right' as const,
      render: (v: number | null) => v ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      render: (v: { name: string } | null) => v?.name ?? '-',
    },
    {
      title: 'Cost Center',
      dataIndex: 'costCenter',
      render: (c: { name: string } | null) => c?.name ?? '-',
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledPaymentDate',
      width: 150,
      render: (d: string | null) => d ? (
        <Space>
          <CalendarOutlined />
          {new Date(d).toLocaleDateString()}
        </Space>
      ) : <Tag color="orange">Not scheduled</Tag>,
    },
    {
      title: 'PO',
      dataIndex: 'hasPO',
      width: 80,
      render: (has: boolean) => has ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>,
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      width: 70,
      align: 'right' as const,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Payment Queue</h2>
        <Button onClick={fetchItems}>Refresh</Button>
      </div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Purchase requests awaiting payment scheduling or confirmation.
      </Typography.Text>
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} items` }}
      />
    </div>
  );
}
