'use client';

import { Table, Typography, Select, DatePicker, Space, Tag, Input } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTenantSwitcher } from '@/components/providers/TenantSwitcher';
import { useColumnSearch } from '@/components/ui/columnSearch';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const EVENT_TYPES = [
  { value: 'data_change', label: 'Data Change' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'auth', label: 'Authentication' },
  { value: 'permission', label: 'Permission' },
  { value: 'config', label: 'Configuration' },
  { value: 'data_access', label: 'Data Access' },
];

const EVENT_COLORS: Record<string, string> = {
  data_change: 'blue',
  workflow: 'purple',
  auth: 'cyan',
  permission: 'orange',
  config: 'gold',
  data_access: 'green',
};

export default function AuditLogPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<string>();
  const [resource, setResource] = useState('');
  const { tenantParam } = useTenantSwitcher();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (eventType) params.set('eventType', eventType);
    if (resource) params.set('resource', resource);
    if (tenantParam) params.set(...tenantParam.split('=') as [string, string]);
    try {
      const res = await fetch(`/api/v1/core/audit-log?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, eventType, resource, tenantParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { getColumnSearchProps } = useColumnSearch();

  const columns = [
    {
      title: 'Time', dataIndex: 'createdAt', key: 'createdAt', width: 170,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: 'Event', dataIndex: 'eventType', key: 'eventType', width: 130,
      filters: EVENT_TYPES.map(e => ({ text: e.label, value: e.value })),
      onFilter: (value: any, record: any) => record.eventType === value,
      render: (t: string) => <Tag color={EVENT_COLORS[t] ?? 'default'}>{t}</Tag>,
    },
    { title: 'Action', dataIndex: 'action', key: 'action', width: 100, sorter: (a: any, b: any) => (a.action ?? '').localeCompare(b.action ?? ''), ...getColumnSearchProps('action') },
    { title: 'Resource', dataIndex: 'resource', key: 'resource', width: 150, sorter: (a: any, b: any) => (a.resource ?? '').localeCompare(b.resource ?? ''), ...getColumnSearchProps('resource') },
    { title: 'Resource ID', dataIndex: 'resourceId', key: 'resourceId', width: 100, ...getColumnSearchProps('resourceId') },
    {
      title: 'User', dataIndex: 'user', key: 'user', width: 150,
      sorter: (a: any, b: any) => (a.user?.name ?? '').localeCompare(b.user?.name ?? ''),
      ...getColumnSearchProps('user', 'name'),
      render: (u: any) => u?.name ?? '-',
    },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 130, ...getColumnSearchProps('ipAddress') },
    {
      title: 'Module', dataIndex: 'moduleId', key: 'moduleId', width: 120,
      ...getColumnSearchProps('moduleId'),
      render: (m: string | null) => m ?? '-',
    },
  ];

  return (
    <div>
      <Title level={4}>Audit Log</Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Event type"
          options={EVENT_TYPES}
          value={eventType}
          onChange={setEventType}
          allowClear
          style={{ width: 180 }}
        />
        <Input
          placeholder="Resource type..."
          value={resource}
          onChange={e => setResource(e.target.value)}
          allowClear
          style={{ width: 180 }}
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
        expandable={{
          expandedRowRender: (record) => (
            <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify({ previous: record.previousData, new: record.newData, metadata: record.metadata }, null, 2)}
            </pre>
          ),
        }}
      />
    </div>
  );
}
