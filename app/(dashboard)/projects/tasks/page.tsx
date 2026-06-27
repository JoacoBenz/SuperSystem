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
  App,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'default',
  in_progress: 'processing',
  review: 'warning',
  done: 'success',
  cancelled: 'error',
};

const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function TasksPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [projectFilter, setProjectFilter] = useState<number | undefined>(undefined);
  const [projects, setProjects] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/projects?limit=100');
      const json = await res.json();
      setProjects(json.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (statusFilter) params.set('status', statusFilter);
    if (projectFilter) params.set('projectId', String(projectFilter));
    try {
      const res = await fetch(`/api/v1/projects/tasks?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      message.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, projectFilter, message]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        description: values.description || undefined,
        status: values.status ?? 'todo',
        priority: values.priority ?? 'medium',
      };
      if (values.assigneeId) payload.assigneeId = Number(values.assigneeId);
      if (values.estimatedHours) payload.estimatedHours = Number(values.estimatedHours);
      if (values.dueDate) payload.dueDate = values.dueDate.toISOString();

      const projectId = values.projectId;
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create task');
        return;
      }
      message.success('Task created successfully');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Project',
      key: 'project',
      width: 180,
      ellipsis: true,
      render: (_: any, record: any) => record.project?.name ?? '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => (
        <Tag color={TASK_STATUS_COLORS[s] ?? 'default'}>
          {TASK_STATUS_OPTIONS.find(o => o.value === s)?.label ?? s}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (p: string) => {
        const colors: Record<string, string> = { low: 'default', medium: 'blue', high: 'orange', critical: 'red' };
        return <Tag color={colors[p] ?? 'default'}>{PRIORITY_OPTIONS.find(o => o.value === p)?.label ?? p}</Tag>;
      },
    },
    {
      title: 'Assignee ID',
      dataIndex: 'assigneeId',
      key: 'assigneeId',
      width: 110,
      render: (id: number | null) => (id != null ? `#${id}` : '-'),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Hours Logged',
      dataIndex: 'totalHoursLogged',
      key: 'totalHoursLogged',
      width: 120,
      align: 'right' as const,
      render: (h: number) => (h != null ? `${h.toFixed(1)}h` : '0.0h'),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>All Tasks</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Task
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={10} md={7}>
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: '100%' }}
            options={TASK_STATUS_OPTIONS}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          />
        </Col>
        <Col xs={24} sm={10} md={7}>
          <Select
            allowClear
            showSearch
            placeholder="Filter by project"
            style={{ width: '100%' }}
            options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
            onChange={(v) => { setProjectFilter(v); setPage(1); }}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
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
      />

      {/* New Task Modal */}
      <Modal
        title="New Task"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Project is required' }]}
          >
            <Select
              showSearch
              placeholder="Select a project"
              options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="Task title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="todo">
                <Select options={TASK_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select options={PRIORITY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="dueDate" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimatedHours" label="Estimated Hours">
                <InputNumber min={0.01} step={0.5} precision={2} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="assigneeId" label="Assignee ID">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="User ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
