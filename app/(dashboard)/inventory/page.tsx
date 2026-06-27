'use client';

import { App, Table, Card, Statistic, Row, Col, Tag, Button, Space, Input } from 'antd';
import { DatabaseOutlined, WarningOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

interface StockLevel {
  description: string;
  unit: string;
  totalQuantity: number;
  receptionQuantity: number;
  adjustmentQuantity: number;
  receptionCount: number;
  lastUpdated: string | null;
}

export default function InventoryPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/inventory/stock-levels');
      if (res.ok) setLevels(await res.json());
      else message.error('Failed to load stock levels');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const filtered = levels.filter(l =>
    !search || l.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = levels.length;
  const inStockItems = levels.filter(l => l.totalQuantity > 0).length;
  const lowStockItems = levels.filter(l => l.totalQuantity > 0 && l.totalQuantity <= 5).length;
  const outOfStockItems = levels.filter(l => l.totalQuantity <= 0).length;

  const columns: ColumnsType<StockLevel> = [
    {
      title: 'Item Description',
      dataIndex: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      width: 90,
    },
    {
      title: 'In Stock',
      dataIndex: 'totalQuantity',
      width: 120,
      align: 'right' as const,
      sorter: (a, b) => a.totalQuantity - b.totalQuantity,
      render: (qty: number) => (
        <Tag color={qty <= 0 ? 'red' : qty <= 5 ? 'orange' : 'green'}>
          {qty.toFixed(2)}
        </Tag>
      ),
    },
    {
      title: 'From Receptions',
      dataIndex: 'receptionQuantity',
      width: 150,
      align: 'right' as const,
      render: (qty: number) => qty.toFixed(2),
    },
    {
      title: 'Adjustments',
      dataIndex: 'adjustmentQuantity',
      width: 130,
      align: 'right' as const,
      render: (qty: number) => (
        <span style={{ color: qty > 0 ? '#52c41a' : qty < 0 ? '#ff4d4f' : undefined }}>
          {qty > 0 ? '+' : ''}{qty.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Receptions',
      dataIndex: 'receptionCount',
      width: 110,
      align: 'right' as const,
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      width: 180,
      render: (d: string | null) => d ? new Date(d).toLocaleString() : '-',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Stock Levels</h2>
          <SoonWithAI
            feature="Demand Forecasting"
            description="Predicts demand per item and recommends reorder points and quantities to avoid both stockouts and dead stock sitting on the shelf."
          />
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => router.push('/inventory/adjustments')}>
            New Adjustment
          </Button>
          <Button onClick={fetchLevels}>Refresh</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="dash-tile" onClick={() => router.push('/inventory/entries')}>
            <Statistic title="Total Items" value={totalItems} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="dash-tile" onClick={() => router.push('/inventory/entries')}>
            <Statistic title="In Stock" value={inStockItems} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="dash-tile" onClick={() => router.push('/inventory/adjustments')}>
            <Statistic title="Low Stock (≤5)" value={lowStockItems} styles={{ content: { color: '#fa8c16' } }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="dash-tile" onClick={() => router.push('/inventory/adjustments')}>
            <Statistic title="Out of Stock" value={outOfStockItems} styles={{ content: { color: '#ff4d4f' } }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        extra={
          <Input.Search
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
        }
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey={r => r.description + '|' + r.unit}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
        />
      </Card>
    </div>
  );
}
