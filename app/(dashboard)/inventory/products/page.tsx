'use client';

import { Table, Button, Space, Input, Typography, Row, Col, Modal, Form, InputNumber, Select, App, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

export default function ProductsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (debouncedSearch) params.set('search', debouncedSearch);
    try {
      const res = await fetch(`/api/v1/inventory/products?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/inventory/categories?active=true&limit=100');
      const json = await res.json();
      setCategories(json.data ?? []);
    } catch {}
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    fetchCategories();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      costPrice: record.costPrice ? Number(record.costPrice) : undefined,
      salePrice: record.salePrice ? Number(record.salePrice) : undefined,
      minStock: record.minStock ? Number(record.minStock) : undefined,
      maxStock: record.maxStock ? Number(record.maxStock) : undefined,
    });
    fetchCategories();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const url = editing ? `/api/v1/inventory/products/${editing.id}` : '/api/v1/inventory/products';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success(editing ? 'Product updated' : 'Product created');
      setModalOpen(false);
      fetchData();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/inventory/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success('Product deactivated');
      fetchData();
    } catch {
      message.error('An error occurred');
    }
  };

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Category', key: 'category',
      render: (_: any, record: any) => record.category?.name ?? '-',
    },
    { title: 'Unit', dataIndex: 'unitOfMeasure', key: 'unitOfMeasure', width: 80 },
    {
      title: 'Cost Price', dataIndex: 'costPrice', key: 'costPrice', width: 120,
      render: (v: string | null) => v ? `$${Number(v).toLocaleString()}` : '-',
    },
    {
      title: 'Sale Price', dataIndex: 'salePrice', key: 'salePrice', width: 120,
      render: (v: string | null) => v ? `$${Number(v).toLocaleString()}` : '-',
    },
    {
      title: 'Active', dataIndex: 'active', key: 'active', width: 70,
      render: (a: boolean) => <Tag color={a ? 'green' : 'default'}>{a ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Deactivate this product?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Products</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Product</Button>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
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
        title={editing ? 'Edit Product' : 'New Product'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ active: true, unitOfMeasure: 'units' }}>
          <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="categoryId" label="Category">
            <Select allowClear placeholder="Select category">
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="unitOfMeasure" label="Unit of Measure">
            <Input />
          </Form.Item>
          <Form.Item name="minStock" label="Min Stock">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="maxStock" label="Max Stock">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="costPrice" label="Cost Price">
            <InputNumber prefix="$" style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="salePrice" label="Sale Price">
            <InputNumber prefix="$" style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
