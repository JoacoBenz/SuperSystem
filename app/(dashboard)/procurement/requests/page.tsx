'use client';

import { Table, Button, Space, Input, Select, Typography, Tag, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PURCHASE_REQUEST_STATUS_LABELS, PURCHASE_REQUEST_STATUS_COLORS, URGENCY_OPTIONS } from '@/src/modules/procurement/types';

const { Title } = Typography;

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (status) params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);

    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, status, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: '#', dataIndex: 'number', key: 'number', width: 120 },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 180,
      render: (s: string) => <StatusBadge status={s} labels={PURCHASE_REQUEST_STATUS_LABELS} colors={PURCHASE_REQUEST_STATUS_COLORS} />,
    },
    {
      title: 'Urgency', dataIndex: 'urgency', key: 'urgency', width: 100,
      render: (u: string) => {
        const opt = URGENCY_OPTIONS.find(o => o.value === u);
        return <Tag color={opt?.color ?? 'default'}>{opt?.label ?? u}</Tag>;
      },
    },
    {
      title: 'Estimated Total', dataIndex: 'estimatedTotal', key: 'estimatedTotal', width: 140,
      render: (v: string | null) => v ? `$${Number(v).toLocaleString()}` : '-',
    },
    {
      title: 'Vendor', dataIndex: 'vendor', key: 'vendor', width: 150,
      render: (v: any) => v?.name ?? '-',
    },
    {
      title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  const statusOptions = Object.entries(PURCHASE_REQUEST_STATUS_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Purchase Requests</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/procurement/requests/new')}>
            New Request
          </Button>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="Filter by status"
          options={statusOptions}
          value={status}
          onChange={setStatus}
          allowClear
          style={{ width: 200 }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `${t} total`,
          showSizeChanger: true,
        }}
        onRow={(record) => ({
          onClick: () => router.push(`/procurement/requests/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
}
