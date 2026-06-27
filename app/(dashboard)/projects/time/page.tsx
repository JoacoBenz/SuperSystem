'use client';

import {
  Table,
  Button,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Card,
  Statistic,
  App,
} from 'antd';
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function TimeTrackingPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [form] = Form.useForm();

  // Compute total hours this month from loaded entries
  const [monthlyHours, setMonthlyHours] = useState(0);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch('/api/v1/projects/tasks?limit=100');
      const json = await res.json();
      setTasks(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    try {
      const res = await fetch(`/api/v1/projects/time?${params}`);
      const json = await res.json();
      const entries: any[] = json.data ?? [];
      setData(entries);
      setTotal(json.total ?? 0);

      // Compute hours this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const hours = entries
        .filter((e: any) => new Date(e.date) >= monthStart)
        .reduce((sum: number, e: any) => sum + Number(e.hours), 0);
      setMonthlyHours(hours);
    } catch {
      message.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, message]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        taskId: Number(values.taskId),
        hours: Number(values.hours),
        description: values.description || undefined,
      };
      if (values.date) payload.date = values.date.toISOString();

      const res = await fetch('/api/v1/projects/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to log time');
        return;
      }
      message.success('Time logged successfully');
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
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Task',
      key: 'task',
      ellipsis: true,
      render: (_: any, record: any) => record.task?.title ?? '-',
    },
    {
      title: 'Project',
      key: 'project',
      width: 180,
      ellipsis: true,
      render: (_: any, record: any) => record.task?.project?.name ?? '-',
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      width: 90,
      align: 'right' as const,
      render: (h: number) => (h != null ? `${Number(h).toFixed(2)}h` : '-'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (d: string | null) => d ?? '-',
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Time Tracking</Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
            Log Time
          </Button>
        </Col>
      </Row>

      {/* Monthly Summary */}
      <Row style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`Hours Logged This Month`}
              value={monthlyHours.toFixed(1)}
              suffix="h"
              prefix={<ClockCircleOutlined />}
              loading={loading}
            />
          </Card>
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

      {/* Log Time Modal */}
      <Modal
        title="Log Time"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={480}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="taskId"
            label="Task"
            rules={[{ required: true, message: 'Please select a task' }]}
          >
            <Select
              showSearch
              loading={tasksLoading}
              placeholder="Search and select a task"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={tasks.map((t: any) => ({
                value: t.id,
                label: t.project ? `${t.project.name} / ${t.title}` : t.title,
              }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="hours"
                label="Hours"
                rules={[
                  { required: true, message: 'Hours are required' },
                  { type: 'number', min: 0.01, message: 'Must be greater than 0' },
                ]}
              >
                <InputNumber
                  min={0.01}
                  step={0.25}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} maxLength={500} placeholder="What did you work on?" showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
