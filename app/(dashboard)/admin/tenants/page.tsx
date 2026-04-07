'use client';

import { Table, Typography, Tag, Card, Descriptions, Modal, Button, Space, Row, Col, Spin } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useColumnSearch } from '@/components/ui/columnSearch';

const { Title } = Typography;

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/core/tenants')
      .then(r => r.json())
      .then(d => setTenants(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewTenant = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/core/tenants/${id}`);
      const data = await res.json();
      setSelectedTenant(data.data ?? data);
    } catch {} finally {
      setDetailLoading(false);
    }
  };

  const { getColumnSearchProps } = useColumnSearch();

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: (a: any, b: any) => a.id - b.id },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: any, b: any) => a.name.localeCompare(b.name), ...getColumnSearchProps('name') },
    { title: 'Slug', dataIndex: 'slug', key: 'slug', width: 120, sorter: (a: any, b: any) => a.slug.localeCompare(b.slug), ...getColumnSearchProps('slug') },
    { title: 'Contact', dataIndex: 'contactEmail', key: 'contactEmail', ...getColumnSearchProps('contactEmail') },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      filters: [{ text: 'Active', value: 'active' }, { text: 'Suspended', value: 'suspended' }],
      onFilter: (value: any, record: any) => record.status === value,
      render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'suspended' ? 'red' : 'default'}>{s}</Tag>,
    },
    {
      title: 'Users', key: 'users', width: 80,
      sorter: (a: any, b: any) => (a._count?.users ?? 0) - (b._count?.users ?? 0),
      render: (_: any, r: any) => <Tag>{r._count?.users ?? 0}</Tag>,
    },
    {
      title: 'Modules', key: 'modules', width: 200,
      render: (_: any, r: any) => r.tenantModules?.map((m: any) => (
        <Tag key={m.moduleId} color="blue">{m.moduleId}</Tag>
      )) ?? '-',
    },
    {
      title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => viewTenant(r.id)} />
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Tenant Management</Title>

      <Table
        columns={columns}
        dataSource={tenants}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={selectedTenant ? `Tenant: ${selectedTenant.name}` : 'Tenant Details'}
        open={!!selectedTenant}
        onCancel={() => setSelectedTenant(null)}
        footer={null}
        width={800}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : selectedTenant && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="ID">{selectedTenant.id}</Descriptions.Item>
              <Descriptions.Item label="Slug">{selectedTenant.slug}</Descriptions.Item>
              <Descriptions.Item label="Contact">{selectedTenant.contactEmail}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedTenant.status === 'active' ? 'green' : 'red'}>{selectedTenant.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Currency">{selectedTenant.currency}</Descriptions.Item>
              <Descriptions.Item label="Timezone">{selectedTenant.timezone}</Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(selectedTenant.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Users">{selectedTenant._count?.users ?? 0}</Descriptions.Item>
            </Descriptions>

            <Card title="Enabled Modules" size="small" style={{ marginBottom: 16 }}>
              {selectedTenant.tenantModules?.length ? (
                selectedTenant.tenantModules
                  .filter((m: any) => m.enabled)
                  .map((m: any) => <Tag key={m.moduleId} color="blue">{m.moduleId}</Tag>)
              ) : 'No modules enabled'}
            </Card>

            <Card title="Users" size="small" style={{ marginBottom: 16 }}>
              <Table
                dataSource={selectedTenant.users ?? []}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name' },
                  { title: 'Email', dataIndex: 'email', key: 'email' },
                  {
                    title: 'Role', dataIndex: 'orgRole', key: 'orgRole', width: 100,
                    render: (r: string) => <Tag color={r === 'super_admin' ? 'purple' : r === 'admin' ? 'blue' : 'default'}>{r}</Tag>,
                  },
                  {
                    title: 'Active', dataIndex: 'active', key: 'active', width: 70,
                    render: (a: boolean) => <Tag color={a ? 'green' : 'default'}>{a ? 'Yes' : 'No'}</Tag>,
                  },
                ]}
              />
            </Card>

            {selectedTenant.tenantConfigs?.length > 0 && (
              <Card title="Configuration" size="small">
                <Table
                  dataSource={selectedTenant.tenantConfigs}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Key', dataIndex: 'key', key: 'key' },
                    { title: 'Value', dataIndex: 'value', key: 'value' },
                  ]}
                />
              </Card>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
