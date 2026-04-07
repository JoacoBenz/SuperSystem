'use client';

import { Table, Typography, Tag, Switch, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTenantSwitcher } from '@/components/providers/TenantSwitcher';
import { useColumnSearch } from '@/components/ui/columnSearch';

const { Title } = Typography;

const PRIORITY_ORDER: Record<string, number> = {
  procurement: 1,
  inventory: 2,
  budget: 3,
  hr: 4,
  sales: 5,
  accounting: 6,
  treasury: 7,
  payroll: 8,
  crm: 9,
  projects: 10,
};

export default function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const { tenantParam, selectedTenantId } = useTenantSwitcher();

  const fetchModules = async () => {
    setLoading(true);
    try {
      const tp = tenantParam ? `?${tenantParam}` : '';
      const res = await fetch(`/api/v1/core/modules${tp}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];
      list.sort((a: any, b: any) => (PRIORITY_ORDER[a.id] ?? 99) - (PRIORITY_ORDER[b.id] ?? 99));
      setModules(list);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, [tenantParam]);

  const handleToggle = async (moduleId: string, enabled: boolean) => {
    if (!selectedTenantId) return;
    setToggling(moduleId);
    try {
      const res = await fetch('/api/v1/core/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, enabled, tenantId: selectedTenantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to toggle module');
        return;
      }
      message.success(`${moduleId} ${enabled ? 'enabled' : 'disabled'}`);
      fetchModules();
    } catch {
      message.error('Failed to toggle module');
    } finally {
      setToggling(null);
    }
  };

  const { getColumnSearchProps } = useColumnSearch();

  const columns = [
    {
      title: '#', key: 'priority', width: 40,
      render: (_: any, r: any) => PRIORITY_ORDER[r.id] ?? '-',
    },
    {
      title: 'Module', dataIndex: 'name', key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name'),
      render: (name: string, r: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.description}</div>
        </div>
      ),
    },
    {
      title: 'Status', key: 'status', width: 100,
      filters: [{ text: 'Ready', value: 'ready' }, { text: 'Planned', value: 'planned' }],
      onFilter: (value: any, record: any) => value === 'ready' ? record.version !== '0.0.0' : record.version === '0.0.0',
      render: (_: any, r: any) => r.version === '0.0.0'
        ? <Tag>Planned</Tag>
        : <Tag color="blue">v{r.version}</Tag>,
    },
    {
      title: 'Deps', dataIndex: 'dependencies', key: 'dependencies', width: 90,
      render: (deps: string[]) => deps?.length ? deps.map(d => <Tag key={d}>{d}</Tag>) : '-',
    },
    {
      title: 'Perms', dataIndex: 'permissionCount', key: 'permissionCount', width: 70,
      sorter: (a: any, b: any) => (a.permissionCount ?? 0) - (b.permissionCount ?? 0),
      render: (n: number) => n ?? 0,
    },
    {
      title: 'Roles', dataIndex: 'roleCount', key: 'roleCount', width: 70,
      sorter: (a: any, b: any) => (a.roleCount ?? 0) - (b.roleCount ?? 0),
      render: (n: number) => n ?? 0,
    },
    {
      title: 'Enabled', key: 'enabled', width: 85,
      filters: [{ text: 'Yes', value: true }, { text: 'No', value: false }],
      onFilter: (value: any, record: any) => record.enabled === value,
      render: (_: any, r: any) => {
        if (r.version === '0.0.0') return <Tag>-</Tag>;
        return (
          <Switch
            checked={r.enabled}
            loading={toggling === r.id}
            onChange={(checked) => handleToggle(r.id, checked)}
            size="small"
          />
        );
      },
    },
  ];

  return (
    <div>
      <Title level={4}>Modules</Title>
      <Table
        columns={columns}
        dataSource={modules}
        rowKey="id"
        loading={loading}
        pagination={false}
        rowClassName={(record) => record.version === '0.0.0' ? 'module-planned' : ''}
      />
      <style>{`
        .module-planned td { color: #bbb !important; }
        .module-planned .ant-tag { opacity: 0.5; }
      `}</style>
    </div>
  );
}
