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
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: 'blue',
  savings: 'green',
  credit: 'orange',
};

export default function TreasuryAccountsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    try {
      const res = await fetch(`/api/v1/treasury?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          bankName: values.bankName,
          accountNumber: values.accountNumber || null,
          accountType: values.accountType || 'checking',
          currency: values.currency || 'USD',
          notes: values.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create account');
        return;
      }
      message.success('Bank account created');
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
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Bank', dataIndex: 'bankName', key: 'bankName', ellipsis: true },
    {
      title: 'Account Type',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 120,
      render: (t: string) => (
        <Tag color={ACCOUNT_TYPE_COLORS[t] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 140,
      render: (v: number, record: any) =>
        `${record.currency} ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    { title: 'Transactions', dataIndex: 'transactionCount', key: 'transactionCount', width: 120 },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            message.info(`${record.name} — ${record.bankName} | ${record.currency} ${Number(record.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Bank Accounts
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Account
          </Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="Search accounts..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8} md={5}>
          <Select
            placeholder="All types"
            allowClear
            style={{ width: '100%' }}
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            options={[
              { value: 'checking', label: 'Checking' },
              { value: 'savings', label: 'Savings' },
              { value: 'credit', label: 'Credit' },
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
        title="New Bank Account"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Account Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Main Operating Account" />
          </Form.Item>
          <Form.Item name="bankName" label="Bank Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Chase, Wells Fargo..." />
          </Form.Item>
          <Form.Item name="accountNumber" label="Account Number">
            <Input placeholder="••••1234" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="accountType" label="Account Type">
                <Select
                  placeholder="Checking"
                  options={[
                    { value: 'checking', label: 'Checking' },
                    { value: 'savings', label: 'Savings' },
                    { value: 'credit', label: 'Credit' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currency" label="Currency">
                <Input placeholder="USD" maxLength={3} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
