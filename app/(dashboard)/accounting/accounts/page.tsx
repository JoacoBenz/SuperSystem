'use client';

import {
  App,
  Button,
  Col,
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

const { Title } = Typography;

const typeColors: Record<string, string> = {
  asset: 'blue',
  liability: 'red',
  equity: 'purple',
  revenue: 'green',
  expense: 'orange',
};

const accountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export default function AccountingAccountsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (typeFilter) params.set('type', typeFilter);
    try {
      const res = await fetch(`/api/v1/accounting/accounts?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      message.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, message]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAllAccounts = async () => {
    try {
      const res = await fetch('/api/v1/accounting/accounts?limit=200');
      const json = await res.json();
      setAllAccounts(json.data ?? []);
    } catch {
      // silently ignore
    }
  };

  const handleOpenModal = () => {
    fetchAllAccounts();
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/accounting/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: values.code,
          name: values.name,
          type: values.type,
          description: values.description || undefined,
          parentId: values.parentId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create account');
        return;
      }
      message.success('Account created');
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
    { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag color={typeColors[t] ?? 'default'}>{t}</Tag>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 130,
      render: (v: number) =>
        `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'Active' : 'Inactive'}</Tag>,
    },
    { title: 'Children', dataIndex: 'childCount', key: 'childCount', width: 90 },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Chart of Accounts
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
            New Account
          </Button>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Select
            style={{ width: '100%' }}
            placeholder="Filter by type"
            allowClear
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            options={[
              { label: 'All Types', value: undefined },
              ...accountTypes.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t })),
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
        title="New Account"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="code" label="Account Code" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="1000" />
          </Form.Item>
          <Form.Item name="name" label="Account Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Cash and Cash Equivalents" />
          </Form.Item>
          <Form.Item name="type" label="Type" initialValue="asset" rules={[{ required: true }]}>
            <Select
              options={accountTypes.map((t) => ({
                label: t.charAt(0).toUpperCase() + t.slice(1),
                value: t,
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Account">
            <Select
              allowClear
              showSearch
              placeholder="Select parent account (optional)"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={allAccounts.map((a) => ({
                label: `${a.code} - ${a.name}`,
                value: a.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
