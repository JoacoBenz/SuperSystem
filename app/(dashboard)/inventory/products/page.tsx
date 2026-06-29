'use client';
import { App, Table, Button, Modal, Form, Input, InputNumber, Tag, Row, Col, Space, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  costPrice: number | null;
  salePrice: number | null;
  minStock: number | null;
  maxStock: number | null;
  active: boolean;
}

export default function ProductsPage() {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/v1/inventory/products?${params}`);
      if (res.ok) { const d = await res.json(); setProducts(d.data ?? []); }
      else message.error('Failed to load products');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ unitOfMeasure: 'units' }); setOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); form.setFieldsValue(p); setOpen(true); };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const url = editing ? `/api/v1/inventory/products/${editing.id}` : '/api/v1/inventory/products';
      const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (res.ok) { message.success(editing ? 'Product updated' : 'Product created'); setOpen(false); form.resetFields(); fetchProducts(); }
      else { const e = await res.json(); message.error(e?.error?.message ?? 'Save failed'); }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const retire = async (p: Product) => {
    try {
      const res = await fetch(`/api/v1/inventory/products/${p.id}`, { method: 'DELETE' });
      if (res.ok) { message.success('Product retired'); fetchProducts(); }
      else message.error('Failed to retire');
    } catch { message.error('Network error'); }
  };

  const money = (v: number | null) => (v == null ? '—' : `$ ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const columns: ColumnsType<Product> = [
    { title: 'SKU', dataIndex: 'sku', width: 120 },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Unit', dataIndex: 'unitOfMeasure', width: 90 },
    { title: 'Cost', dataIndex: 'costPrice', align: 'right', width: 110, render: money },
    { title: 'Sale', dataIndex: 'salePrice', align: 'right', width: 110, render: money },
    { title: 'Status', dataIndex: 'active', width: 90, render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'ACTIVE' : 'RETIRED'}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 150, render: (_: unknown, p) => (
        <Space size="small">
          <Button size="small" onClick={() => openEdit(p)}>Edit</Button>
          {p.active && <Popconfirm title="Retire this product?" onConfirm={() => retire(p)}><Button size="small" danger>Retire</Button></Popconfirm>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Products</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search placeholder="Search SKU or name" allowClear style={{ width: 220 }} onSearch={setSearch} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Product</Button>
        </div>
      </div>

      <Table columns={columns} dataSource={products} rowKey="id" loading={loading} size="small" />

      <Modal title={editing ? `Edit ${editing.sku}` : 'New Product'} open={open} onCancel={() => { setOpen(false); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden width={560}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={10}><Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input placeholder="OFF-010" disabled={!!editing} /></Form.Item></Col>
            <Col span={14}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="A4 Paper Reams" /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="unitOfMeasure" label="Unit" initialValue="units"><Input placeholder="units" /></Form.Item></Col>
            <Col span={8}><Form.Item name="costPrice" label="Cost Price"><InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="salePrice" label="Sale Price"><InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="minStock" label="Min Stock"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="maxStock" label="Max Stock"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
