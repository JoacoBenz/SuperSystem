'use client';

import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
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

export default function TreasuryTransactionsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importForm] = Form.useForm();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/treasury?limit=100');
      const json = await res.json();
      setAccounts(json.data ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (accountFilter) params.set('accountId', String(accountFilter));
    if (typeFilter) params.set('type', typeFilter);
    try {
      const res = await fetch(`/api/v1/treasury/transactions?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, accountFilter, typeFilter]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/treasury/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: values.bankAccountId,
          description: values.description,
          amount: values.amount,
          type: values.type,
          reference: values.reference || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create transaction');
        return;
      }
      message.success('Transaction created');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (values: any) => {
    setImporting(true);
    try {
      const res = await fetch('/api/v1/treasury/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: values.bankAccountId, csv: values.csv }),
      });
      const json = await res.json();
      if (!res.ok) { message.error(json?.error?.message ?? 'Import failed'); return; }
      message.success(`Imported ${json.imported} · reconciled ${json.reconciled} · duplicates ${json.duplicates}`);
      setImportOpen(false);
      importForm.resetFields();
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setImporting(false);
    }
  };

  const accountOptions = accounts.map((a: any) => ({ value: a.id, label: a.name }));

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      ellipsis: true,
      render: (v: string | null) => v ?? '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (v: number, record: any) => (
        <span style={{ color: record.type === 'credit' ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          {record.type === 'debit' ? '-' : '+'}${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (t: string) => (
        <Tag color={t === 'credit' ? 'success' : 'error'} style={{ textTransform: 'capitalize' }}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Reconciled',
      dataIndex: 'reconciled',
      key: 'reconciled',
      width: 120,
      render: (r: boolean) => (
        <Tag color={r ? 'success' : 'warning'}>{r ? 'Reconciled' : 'Pending'}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Transactions
          </Title>
        </Col>
        <Col>
          <Button style={{ marginRight: 8 }} onClick={() => setImportOpen(true)}>
            Import Statement
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Transaction
          </Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={10} md={7}>
          <Select
            placeholder="All accounts"
            allowClear
            style={{ width: '100%' }}
            value={accountFilter}
            onChange={(v) => { setAccountFilter(v); setPage(1); }}
            options={accountOptions}
          />
        </Col>
        <Col xs={24} sm={7} md={5}>
          <Select
            placeholder="All types"
            allowClear
            style={{ width: '100%' }}
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            options={[
              { value: 'credit', label: 'Credit' },
              { value: 'debit', label: 'Debit' },
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
        title="New Transaction"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="bankAccountId" label="Account" rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="Select account" options={accountOptions} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Payment for invoice #1234..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber
                  min={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Required' }]}>
                <Select
                  placeholder="Select type"
                  options={[
                    { value: 'credit', label: 'Credit' },
                    { value: 'debit', label: 'Debit' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Reference">
            <Input placeholder="INV-001, CHK-4567..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import Bank Statement (CSV)"
        open={importOpen}
        onCancel={() => { setImportOpen(false); importForm.resetFields(); }}
        onOk={() => importForm.submit()}
        confirmLoading={importing}
        destroyOnHidden
        width={560}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImport}>
          <Form.Item name="bankAccountId" label="Account" rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="Select account" options={accountOptions} />
          </Form.Item>
          <Form.Item name="csv" label="Statement CSV" rules={[{ required: true, message: 'Paste the CSV' }]} extra="Columns: date, description, amount (or credit/debit), reference. Lines matching an existing reference are reconciled; new lines are posted.">
            <Input.TextArea rows={8} placeholder={'date,description,amount,reference\n2026-06-01,Client payment,500.00,INV-1'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
