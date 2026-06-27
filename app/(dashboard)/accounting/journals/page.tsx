'use client';

import {
  App,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  posted: 'success',
  void: 'error',
};

export default function AccountingJournalsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/v1/accounting/journals?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      message.error('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: values.description,
          date: values.date ? values.date.toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create journal entry');
        return;
      }
      message.success('Journal entry created');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (id: number) => {
    setPosting(id);
    try {
      const res = await fetch(`/api/v1/accounting/journals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'posted' }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to post entry');
        return;
      }
      message.success('Entry posted');
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setPosting(null);
    }
  };

  const handleView = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/accounting/journals/${id}`);
      const json = await res.json();
      const entry = json.data ?? json;
      message.info(
        `${entry.entryNumber} — ${entry.description} | Status: ${entry.status} | Lines: ${entry.lines?.length ?? 0}`,
      );
    } catch {
      message.error('Failed to load entry detail');
    }
  };

  const columns = [
    { title: 'Entry #', dataIndex: 'entryNumber', key: 'entryNumber', width: 120 },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusColors[s] ?? 'default'}>{s}</Tag>,
    },
    { title: 'Lines', dataIndex: 'lineCount', key: 'lineCount', width: 80 },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: any) => (
        <Row gutter={8} wrap={false}>
          <Col>
            <Button size="small" onClick={() => handleView(record.id)}>
              View
            </Button>
          </Col>
          {record.status === 'draft' && (
            <Col>
              <Button
                size="small"
                type="primary"
                loading={posting === record.id}
                onClick={() => handlePost(record.id)}
              >
                Post
              </Button>
            </Col>
          )}
        </Row>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              Journal Entries
            </Title>
            <SoonWithAI
              feature="Auto-Journaling"
              description="Turns a plain-language description into balanced double-entry lines, picks the right accounts, and flags anomalies before you post."
            />
          </span>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Entry
          </Button>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Select
            style={{ width: '100%' }}
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: 'All Statuses', value: undefined },
              { label: 'Draft', value: 'draft' },
              { label: 'Posted', value: 'posted' },
              { label: 'Void', value: 'void' },
            ]}
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

      <Modal
        title="New Journal Entry"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Monthly depreciation, payroll accrual..." />
          </Form.Item>
          <Form.Item name="date" label="Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
