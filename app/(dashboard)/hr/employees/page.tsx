'use client';
import { App, Table, Tag, Input } from 'antd';
import { useEffect, useState, useCallback, useRef } from 'react';

interface Employee {
  id: number;
  name: string;
  email: string;
  orgRole: string;
  createdAt: string;
  department: { id: number; name: string } | null;
}

const ROLE_COLOR: Record<string, string> = {
  admin: 'blue',
  member: 'default',
  super_admin: 'red',
};

export default function EmployeesPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/hr/employees?page=${page}&limit=${pageSize}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
      } else {
        message.error('Failed to load employees');
      }
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [page, pageSize, debouncedSearch, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Department',
      key: 'department',
      render: (_: unknown, r: Employee) => r.department?.name ?? '-',
    },
    {
      title: 'Role',
      dataIndex: 'orgRole',
      key: 'orgRole',
      render: (role: string) => (
        <Tag color={ROLE_COLOR[role] ?? 'default'}>{role}</Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Employee Directory</h2>
        <Input.Search
          placeholder="Search employees..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onSearch={(value) => handleSearchChange(value)}
          style={{ width: 280 }}
          allowClear
        />
      </div>

      <Table
        loading={loading}
        dataSource={data}
        columns={columns}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => setPage(p),
          showTotal: (t) => `${t} employees`,
        }}
      />
    </div>
  );
}
