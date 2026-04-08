'use client';

import { Table, Button, Space, Typography, Row, Col, Modal, Form, Input, Select, App, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

export default function CategoriesPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    try {
      const res = await fetch(`/api/v1/inventory/categories?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchParentCategories = async () => {
    try {
      const res = await fetch('/api/v1/inventory/categories?active=true&limit=100');
      const json = await res.json();
      setParentCategories(json.data ?? []);
    } catch {}
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    fetchParentCategories();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    fetchParentCategories();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const url = editing ? `/api/v1/inventory/categories/${editing.id}` : '/api/v1/inventory/categories';
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
      message.success(editing ? 'Category updated' : 'Category created');
      setModalOpen(false);
      fetchData();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/inventory/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success('Category deactivated');
      fetchData();
    } catch {
      message.error('An error occurred');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Parent', key: 'parent',
      render: (_: any, record: any) => record.parent?.name ?? '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Active', dataIndex: 'active', key: 'active', width: 70,
      render: (a: boolean) => <Tag color={a ? 'green' : 'default'}>{a ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Deactivate this category?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Product Categories</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Category</Button>
        </Col>
      </Row>

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
        title={editing ? 'Edit Category' : 'New Category'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" initialValues={{ active: true }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Category">
            <Select allowClear placeholder="Select parent category">
              {parentCategories
                .filter(c => !editing || c.id !== editing.id)
                .map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
