'use client';

import { Table, Button, Space, Typography, Row, Col, Modal, Form, Input, App, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

export default function WarehousesPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    try {
      const res = await fetch(`/api/v1/inventory/warehouses?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const url = editing ? `/api/v1/inventory/warehouses/${editing.id}` : '/api/v1/inventory/warehouses';
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
      message.success(editing ? 'Warehouse updated' : 'Warehouse created');
      setModalOpen(false);
      fetchData();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/inventory/warehouses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success('Warehouse deactivated');
      fetchData();
    } catch {
      message.error('An error occurred');
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Active', dataIndex: 'active', key: 'active', width: 70,
      render: (a: boolean) => <Tag color={a ? 'green' : 'default'}>{a ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Deactivate this warehouse?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Warehouses</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Warehouse</Button>
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
        title={editing ? 'Edit Warehouse' : 'New Warehouse'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" initialValues={{ active: true }}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. WH-001" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
