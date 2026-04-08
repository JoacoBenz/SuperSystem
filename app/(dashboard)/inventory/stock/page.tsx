'use client';

import { Table, Typography, Row, Col, Tag, Space, Select } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

export default function StockLevelsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/inventory/warehouses?active=true&limit=100');
        const json = await res.json();
        setWarehouses(json.data ?? []);
      } catch {}
    })();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (warehouseId) params.set('warehouse_id', String(warehouseId));
    try {
      const res = await fetch(`/api/v1/inventory/stock-levels?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, warehouseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      title: 'Product SKU', key: 'productSku', width: 120,
      render: (_: any, record: any) => record.product?.sku ?? '-',
    },
    {
      title: 'Product Name', key: 'productName',
      render: (_: any, record: any) => record.product?.name ?? '-',
    },
    {
      title: 'Warehouse', key: 'warehouse',
      render: (_: any, record: any) => record.warehouse?.name ?? '-',
    },
    { title: 'On Hand', dataIndex: 'quantityOnHand', key: 'quantityOnHand', width: 100 },
    { title: 'Reserved', dataIndex: 'quantityReserved', key: 'quantityReserved', width: 100 },
    {
      title: 'Available', dataIndex: 'quantityAvailable', key: 'quantityAvailable', width: 100,
      render: (v: number) => <span style={{ color: v > 0 ? 'green' : undefined }}>{v}</span>,
    },
    {
      title: 'Min Stock', key: 'minStock', width: 100,
      render: (_: any, record: any) => record.product?.minStock ?? '-',
    },
    {
      title: '', key: 'lowStock', width: 80,
      render: (_: any, record: any) => {
        const min = record.product?.minStock;
        if (min != null && record.quantityAvailable < min) {
          return <Tag color="red">Low Stock</Tag>;
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Stock Levels</Title></Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Filter by warehouse"
          style={{ width: 250 }}
          value={warehouseId}
          onChange={(v) => { setWarehouseId(v); setPage(1); }}
        >
          {warehouses.map(w => (
            <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: page, pageSize, total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: t => `${t} total`,
          showSizeChanger: true,
        }}
      />
    </div>
  );
}
