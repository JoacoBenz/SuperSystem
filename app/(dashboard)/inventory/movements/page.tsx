'use client';

import { Table, Button, Typography, Row, Col, Tag, Space, Select, Modal, Form, InputNumber, Input, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

const MOVEMENT_TYPES = [
  { value: 'receipt', label: 'Receipt', color: 'green' },
  { value: 'issue', label: 'Issue', color: 'red' },
  { value: 'transfer', label: 'Transfer', color: 'blue' },
  { value: 'adjustment', label: 'Adjustment', color: 'orange' },
  { value: 'return', label: 'Return', color: 'purple' },
];

const typeColorMap: Record<string, string> = {
  receipt: 'green',
  issue: 'red',
  transfer: 'blue',
  adjustment: 'orange',
  return: 'purple',
};

export default function StockMovementsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (typeFilter) params.set('type', typeFilter);
    try {
      const res = await fetch(`/api/v1/inventory/stock-movements?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchOptions = async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        fetch('/api/v1/inventory/products?active=true&limit=100'),
        fetch('/api/v1/inventory/warehouses?active=true&limit=100'),
      ]);
      const pJson = await pRes.json();
      const wJson = await wRes.json();
      setProducts(pJson.data ?? []);
      setWarehouses(wJson.data ?? []);
    } catch {}
  };

  const openCreate = () => {
    form.resetFields();
    fetchOptions();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch('/api/v1/inventory/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success('Movement created');
      setModalOpen(false);
      fetchData();
    } catch {} finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 140,
      render: (d: string) => d ? new Date(d).toLocaleString() : '-',
    },
    {
      title: 'Type', dataIndex: 'movementType', key: 'movementType', width: 120,
      render: (t: string) => <Tag color={typeColorMap[t] ?? 'default'}>{t}</Tag>,
    },
    {
      title: 'Product', key: 'product', ellipsis: true,
      render: (_: any, record: any) => record.product?.name ?? '-',
    },
    {
      title: 'From', key: 'warehouseFrom', width: 130,
      render: (_: any, record: any) => record.warehouseFrom?.name ?? '-',
    },
    {
      title: 'To', key: 'warehouseTo', width: 130,
      render: (_: any, record: any) => record.warehouseTo?.name ?? '-',
    },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 70 },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Stock Movements</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Movement</Button>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Filter by type"
          style={{ width: 200 }}
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
        >
          {MOVEMENT_TYPES.map(t => (
            <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
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

      <Modal
        title="New Movement"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="productId" label="Product" rules={[{ required: true }]}>
            <Select placeholder="Select product" showSearch optionFilterProp="children">
              {products.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.sku} - {p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="movementType" label="Movement Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              {MOVEMENT_TYPES.map(t => (
                <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="warehouseFromId" label="From Warehouse">
            <Select allowClear placeholder="Select warehouse">
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="warehouseToId" label="To Warehouse">
            <Select allowClear placeholder="Select warehouse">
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} step={1} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
