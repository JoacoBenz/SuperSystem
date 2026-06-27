'use client';

import { Table, Button, Tag, Typography, Row, Col, Modal, Form, Select, DatePicker, Input, App, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function DelegationsPage() {
  const { message } = App.useApp();
  const [delegations, setDelegations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, uRes, rRes] = await Promise.all([
        fetch('/api/v1/core/delegations'),
        fetch('/api/v1/core/users?limit=200'),
        fetch('/api/v1/core/roles'),
      ]);
      const [d, u, r] = await Promise.all([dRes.json(), uRes.json(), rRes.json()]);
      setDelegations(Array.isArray(d) ? d : []);
      setUsers(Array.isArray(u?.data) ? u.data : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch { message.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const body = {
        delegateId: values.delegateId,
        roleId: values.roleId,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        reason: values.reason || undefined,
      };
      const res = await fetch('/api/v1/core/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create delegation');
        return;
      }
      message.success('Delegation created');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    const res = await fetch(`/api/v1/core/delegations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    });
    if (!res.ok) { message.error('Failed to deactivate'); return; }
    message.success('Delegation deactivated');
    fetchData();
  };

  const columns = [
    {
      title: 'Delegator',
      key: 'delegator',
      render: (_: any, row: any) => <Text>{row.delegator?.name ?? row.delegatorId}</Text>,
    },
    {
      title: 'Delegate',
      key: 'delegate',
      render: (_: any, row: any) => <Text>{row.delegate?.name ?? row.delegateId}</Text>,
    },
    {
      title: 'Role',
      key: 'role',
      render: (_: any, row: any) => <Text>{row.role?.displayName ?? row.roleId}</Text>,
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, row: any) => (
        <Text type="secondary">
          {new Date(row.startDate).toLocaleDateString()} — {new Date(row.endDate).toLocaleDateString()}
        </Text>
      ),
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v: string | null) => v ?? '-' },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (a: boolean) => <Tag color={a ? 'green' : 'default'}>{a ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, row: any) => row.active ? (
        <Popconfirm title="Deactivate this delegation?" onConfirm={() => handleDeactivate(row.id)}>
          <Button size="small" danger>Deactivate</Button>
        </Popconfirm>
      ) : null,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Role Delegations</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            New Delegation
          </Button>
        </Col>
      </Row>

      <Table columns={columns} dataSource={delegations} rowKey="id" loading={loading} pagination={false} />

      <Modal
        title="New Role Delegation"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="delegateId" label="Delegate To" rules={[{ required: true, message: 'Select a user' }]}>
            <Select
              showSearch
              placeholder="Select user"
              optionFilterProp="label"
              options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="roleId" label="Role to Delegate" rules={[{ required: true, message: 'Select a role' }]}>
            <Select
              showSearch
              placeholder="Select role"
              optionFilterProp="label"
              options={roles.map(r => ({ value: r.id, label: r.displayName }))}
            />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input placeholder="e.g. Vacation coverage" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
