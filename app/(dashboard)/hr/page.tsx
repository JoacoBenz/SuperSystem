'use client';
import { App, Card, Statistic, Row, Col, Table, Button, Divider } from 'antd';
import { TeamOutlined, UserAddOutlined, ApartmentOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';

interface DashboardData {
  totalEmployees: number;
  newThisMonth: number;
  byDepartment: { id: number; name: string; count: number }[];
  recentHires: { id: number; name: string; email: string; createdAt: string; department: { name: string } | null }[];
}

export default function HRDashboardPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/hr/dashboard');
      if (res.ok) setData(await res.json());
      else message.error('Failed to load HR dashboard');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeDepartments = data?.byDepartment?.filter(d => d.count > 0).length ?? 0;

  const deptColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Headcount', dataIndex: 'count', key: 'count', sorter: (a: { count: number }, b: { count: number }) => a.count - b.count },
  ];

  const sortedDepts = data?.byDepartment
    ? [...data.byDepartment].sort((a, b) => b.count - a.count)
    : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>HR Dashboard</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Total Employees"
              value={data?.totalEmployees ?? 0}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="New This Month"
              value={data?.newThisMonth ?? 0}
              prefix={<UserAddOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Active Departments"
              value={activeDepartments}
              prefix={<ApartmentOutlined />}
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Contractors"
              value={0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="By Department">
            <Table
              loading={loading}
              dataSource={sortedDepts}
              columns={deptColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Recent Hires" loading={loading}>
            {(data?.recentHires?.slice(0, 5) ?? []).map((item, idx, arr) => (
              <div key={item.id}>
                <div style={{ padding: '8px 0' }}>
                  <strong>{item.name}</strong>
                  <span style={{ color: '#666', marginLeft: 8 }}>{item.department?.name ?? 'No Department'}</span>
                </div>
                {idx < arr.length - 1 && <Divider style={{ margin: 0 }} />}
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
