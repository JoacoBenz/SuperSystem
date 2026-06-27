'use client';

import { Table, Typography, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useTenantSwitcher } from '@/components/providers/TenantSwitcher';
import { useColumnSearch } from '@/components/ui/columnSearch';

const { Title } = Typography;

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantParam } = useTenantSwitcher();

  useEffect(() => {
    setLoading(true);
    const tp = tenantParam ? `?${tenantParam}` : '';
    fetch(`/api/v1/core/roles${tp}`)
      .then(r => r.json())
      .then(d => setRoles(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantParam]);

  const { getColumnSearchProps } = useColumnSearch();

  const columns = [
    {
      title: 'Role', dataIndex: 'displayName', key: 'displayName',
      sorter: (a: any, b: any) => (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
      ...getColumnSearchProps('displayName'),
      render: (dn: string, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{dn ?? r.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.name}</div>
        </div>
      ),
    },
    {
      title: 'Module', dataIndex: 'moduleId', key: 'moduleId', width: 120,
      filters: [{ text: 'Procurement', value: 'procurement' }, { text: 'Core', value: '__core__' }],
      onFilter: (value: any, record: any) => value === '__core__' ? !record.moduleId : record.moduleId === value,
      render: (m: string | null) => m ? <Tag color="blue">{m}</Tag> : <Tag>Core</Tag>,
    },
    {
      title: 'Type', key: 'type', width: 90,
      filters: [{ text: 'System', value: true }, { text: 'Custom', value: false }],
      onFilter: (value: any, record: any) => record.isSystem === value,
      render: (_: any, r: any) => r.isSystem ? <Tag color="gold">System</Tag> : <Tag color="green">Custom</Tag>,
    },
    {
      title: 'Perms', dataIndex: 'rolePermissions', key: 'permissions', width: 70,
      sorter: (a: any, b: any) => (a.rolePermissions?.length ?? 0) - (b.rolePermissions?.length ?? 0),
      render: (perms: any[]) => perms?.length ?? 0,
    },
  ];

  return (
    <div>
      <Title level={4}>Roles & Permissions</Title>
      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {record.rolePermissions?.map((p: any) => (
                <Tag key={p.permissionId} style={{ margin: 0 }}>
                  {p.permission ? `${p.permission.resource}.${p.permission.action}` : p.permissionId}
                </Tag>
              )) ?? 'No permissions'}
            </div>
          ),
        }}
      />
    </div>
  );
}
