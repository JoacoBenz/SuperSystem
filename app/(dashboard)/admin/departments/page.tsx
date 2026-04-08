'use client';

import { Table, Button, Space, Typography, Row, Col, Modal, Form, Input, Select, App, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useTenantSwitcher } from '@/components/providers/TenantSwitcher';
import { useColumnSearch } from '@/components/ui/columnSearch';

const { Title } = Typography;

export default function DepartmentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const { tenantParam } = useTenantSwitcher();
  const { message } = App.useApp();

  useEffect(() => {
    const tp = tenantParam ? `?${tenantParam}&limit=200` : '?limit=200';
    fetch(`/api/v1/core/users${tp}`).then(r => r.json()).then(d => setUsers(d.data ?? [])).catch(() => {});
  }, [tenantParam]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tp = tenantParam ? `?${tenantParam}` : '';
      const res = await fetch(`/api/v1/core/departments${tp}`);
      const json = await res.json();
      setData(json.data ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, [tenantParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    form.setFieldsValue({ name: dept.name, description: dept.description, parentId: dept.parentId, managerId: dept.managerId });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const url = editing ? `/api/v1/core/departments/${editing.id}` : '/api/v1/core/departments';
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
      message.success(editing ? 'Department updated' : 'Department created');
      setModalOpen(false);
      fetchData();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/core/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success('Department deleted');
      fetchData();
    } catch {
      message.error('An error occurred');
    }
  };

  const { getColumnSearchProps } = useColumnSearch();

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: any, b: any) => a.name.localeCompare(b.name), ...getColumnSearchProps('name') },
    {
      title: 'Parent', dataIndex: 'parent', key: 'parent', width: 150,
      sorter: (a: any, b: any) => (a.parent?.name ?? '').localeCompare(b.parent?.name ?? ''),
      ...getColumnSearchProps('parent', 'name'),
      render: (p: any) => p?.name ?? '-',
    },
    {
      title: 'Manager', dataIndex: 'manager', key: 'manager', width: 150,
      sorter: (a: any, b: any) => (a.manager?.name ?? '').localeCompare(b.manager?.name ?? ''),
      ...getColumnSearchProps('manager', 'name'),
      render: (m: any) => m?.name ?? '-',
    },
    {
      title: 'Users', dataIndex: '_count', key: 'users', width: 80,
      sorter: (a: any, b: any) => (a._count?.users ?? 0) - (b._count?.users ?? 0),
      render: (c: any) => <Tag>{c?.users ?? 0}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this department?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Departments</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Department</Button>
        </Col>
      </Row>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} size="small" />

      <Modal
        title={editing ? 'Edit Department' : 'New Department'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Department">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="None (top-level)"
              options={data.filter(d => d.id !== editing?.id).map(d => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="managerId" label="Manager">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Select manager"
              options={users.map(u => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
