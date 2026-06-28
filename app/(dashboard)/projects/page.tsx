'use client';

import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Card,
  Statistic,
  Space,
  App,
} from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  planning: 'default',
  active: 'processing',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

export default function ProjectsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  // KPI state
  const [kpiLoading, setKpiLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/v1/projects?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      message.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, message]);

  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const [allRes, activeRes] = await Promise.all([
        fetch('/api/v1/projects?limit=1'),
        fetch('/api/v1/projects?limit=100&status=active'),
      ]);
      const allJson = await allRes.json();
      const activeJson = await activeRes.json();

      setTotalProjects(allJson.total ?? 0);
      setActiveProjects(activeJson.total ?? 0);

      const activeData: any[] = activeJson.data ?? [];
      const taskSum = activeData.reduce((s: number, p: any) => s + (p.taskCount ?? 0), 0);
      setTotalTasks(taskSum);
    } catch {
      // silently ignore kpi errors
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        description: values.description || undefined,
        status: values.status ?? 'planning',
        priority: values.priority ?? 'medium',
        currency: values.currency ?? 'USD',
      };
      if (values.budget) payload.budget = Number(values.budget);
      if (values.startDate) payload.startDate = values.startDate.toISOString();
      if (values.endDate) payload.endDate = values.endDate.toISOString();

      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create project');
        return;
      }
      message.success('Project created successfully');
      setModalOpen(false);
      form.resetFields();
      fetchData();
      fetchKpis();
    } catch {
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (record: any) => {
    const statusLabel = STATUS_OPTIONS.find(s => s.value === record.status)?.label ?? record.status;
    const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === record.priority)?.label ?? record.priority;
    const budget = record.budget != null ? `${record.currency} ${Number(record.budget).toLocaleString()}` : 'No budget';
    const start = record.startDate ? new Date(record.startDate).toLocaleDateString() : '-';
    const end = record.endDate ? new Date(record.endDate).toLocaleDateString() : '-';
    message.info(
      `${record.name} | Status: ${statusLabel} | Priority: ${priorityLabel} | Tasks: ${record.taskCount ?? 0} | Budget: ${budget} | ${start} → ${end}`,
    );
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string) => (
        <Space>
          <FolderOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s] ?? 'default'}>
          {STATUS_OPTIONS.find(o => o.value === s)?.label ?? s}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (p: string) => (
        <Tag color={PRIORITY_COLORS[p] ?? 'default'}>
          {PRIORITY_OPTIONS.find(o => o.value === p)?.label ?? p}
        </Tag>
      ),
    },
    {
      title: 'Tasks',
      dataIndex: 'taskCount',
      key: 'taskCount',
      width: 80,
      align: 'center' as const,
      render: (count: number) => count ?? 0,
    },
    {
      title: 'Budget',
      key: 'budget',
      width: 150,
      render: (_: any, record: any) =>
        record.budget != null
          ? `${record.currency} ${Number(record.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : '-',
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Button size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>Projects</Title>
            <SoonWithAI
              feature="Planning Assistant"
              description="Generates a task breakdown from a project description, estimates effort per task, and flags projects likely to slip their deadline."
            />
          </span>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Project
          </Button>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="dash-tile" onClick={() => router.push('/projects')}>
            <Statistic
              title="Total Projects"
              value={totalProjects}
              loading={kpiLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="dash-tile" onClick={() => router.push('/projects')}>
            <Statistic
              title="Active Projects"
              value={activeProjects}
              loading={kpiLoading}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="dash-tile" onClick={() => router.push('/projects/tasks')}>
            <Statistic
              title="Total Tasks (Active)"
              value={totalTasks}
              loading={kpiLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input.Search
            placeholder="Search projects..."
            allowClear
            onSearch={(v) => { setSearch(v); setPage(1); }}
            onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } }}
          />
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: '100%' }}
            options={STATUS_OPTIONS}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `${t} total`,
          showSizeChanger: true,
        }}
        onRow={() => ({
          onClick: () => router.push('/projects/tasks'),
          style: { cursor: 'pointer' },
        })}
      />

      {/* New Project Modal */}
      <Modal
        title="New Project"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Project name is required' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="planning">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select options={PRIORITY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="budget" label="Budget">
                <InputNumber
                  min={0}
                  step={100}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label="Currency" initialValue="USD">
                <Select>
                  {CURRENCY_OPTIONS.map((c) => (
                    <Select.Option key={c} value={c}>{c}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
