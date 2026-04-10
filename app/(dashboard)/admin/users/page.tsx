'use client';

import { Table, Button, Space, Input, Select, Typography, Tag, Row, Col, Modal, Form, App, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useTenantSwitcher } from '@/components/providers/TenantSwitcher';
import { useColumnSearch } from '@/components/ui/columnSearch';

const { Title, Text } = Typography;

const ORG_ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
];

const MODULE_COLORS: Record<string, string> = {
  procurement: 'blue',
  inventory: 'green',
  hr: 'orange',
  sales: 'purple',
  accounting: 'cyan',
};

function formatRoleName(role: { name?: string; displayName?: string }) {
  const name = role.name ?? '';
  const parts = name.split('.');
  if (parts.length < 2) return role.displayName ?? name;
  const module = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const roleName = role.displayName ?? parts[1];
  return { module, roleName, moduleKey: parts[0] };
}

export default function UsersPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const { tenantParam } = useTenantSwitcher();
  const { message } = App.useApp();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const tp = tenantParam ? `?${tenantParam}` : '';
    fetch(`/api/v1/core/roles${tp}`).then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : d.data ?? [])).catch(() => {});
    fetch(`/api/v1/core/departments${tp}`).then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : d.data ?? [])).catch(() => {});
  }, [tenantParam]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (tenantParam) params.set(...tenantParam.split('=') as [string, string]);
    try {
      const res = await fetch(`/api/v1/core/users?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, tenantParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      orgRole: user.orgRole,
      departmentId: user.departmentId,
      roleIds: (user.userRoles ?? user.roles)?.map((r: any) => r.roleId ?? r.id) ?? [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const url = editingUser
        ? `/api/v1/core/users/${editingUser.id}`
        : '/api/v1/core/users';
      const res = await fetch(url, {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success(editingUser ? 'User updated' : 'User created');
      setModalOpen(false);
      fetchData();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/core/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Error');
        return;
      }
      message.success('User deactivated');
      fetchData();
    } catch {
      message.error('An error occurred');
    }
  };

  const { getColumnSearchProps } = useColumnSearch();

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: any, b: any) => a.name.localeCompare(b.name), ...getColumnSearchProps('name') },
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a: any, b: any) => a.email.localeCompare(b.email), ...getColumnSearchProps('email') },
    {
      title: 'Org Role', dataIndex: 'orgRole', key: 'orgRole', width: 120,
      filters: [...new Set(data.map((u: any) => u.orgRole))].map((r: string) => ({ text: r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' '), value: r })),
      onFilter: (value: any, record: any) => record.orgRole === value,
      render: (r: string) => <Tag color={r === 'admin' ? 'blue' : r === 'super_admin' ? 'purple' : 'default'}>{r}</Tag>,
    },
    {
      title: 'Department', dataIndex: 'department', key: 'department', width: 150,
      sorter: (a: any, b: any) => (a.department?.name ?? '').localeCompare(b.department?.name ?? ''),
      ...getColumnSearchProps('department', 'name'),
      render: (d: any) => d?.name ?? '-',
    },
    {
      title: 'Modules & Roles', dataIndex: 'userRoles', key: 'roles',
      render: (roles: any[]) => {
        if (!roles?.length) return '-';
        const grouped: Record<string, { module: string; moduleKey: string; roles: string[] }> = {};
        for (const r of roles) {
          const info = formatRoleName(r.role ?? r);
          if (typeof info === 'string') continue;
          if (!grouped[info.moduleKey]) grouped[info.moduleKey] = { module: info.module, moduleKey: info.moduleKey, roles: [] };
          grouped[info.moduleKey].roles.push(info.roleName);
        }
        return (
          <Space orientation="vertical" size={6}>
            {Object.entries(grouped).map(([key, g]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <Tag color={MODULE_COLORS[key] ?? 'default'} style={{ fontWeight: 500, marginRight: 0 }}>{g.module}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>{g.roles.join(', ')}</Text>
              </div>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(record); }} />
          <Popconfirm title="Deactivate this user?" onConfirm={() => handleDelete(record.id)} onPopupClick={e => e.stopPropagation()}>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Users</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New User</Button>
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
        pagination={{
          current: page, pageSize, total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: t => `${t} total`,
          showSizeChanger: true,
        }}
      />

      <Modal
        title={editingUser ? 'Edit User' : 'New User'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="orgRole" label="Organization Role" rules={[{ required: true }]}>
            <Select options={ORG_ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="departmentId" label="Department">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Select department"
              options={departments.map((d: any) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="roleIds" label="Module Roles">
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Select roles"
              options={roles.map((r: any) => {
                const info = formatRoleName(r);
                const label = typeof info === 'string' ? info : `${info.module}: ${info.roleName}`;
                return { value: r.id, label };
              })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
