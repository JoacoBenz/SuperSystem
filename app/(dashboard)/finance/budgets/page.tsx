'use client';
import { App, Table, Button, Modal, Form, Input, InputNumber, Select, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface Budget {
  id: number;
  name: string;
  costCenterId: number | null;
  departmentId: number | null;
  fiscalYear: number;
  amount: number;
  currency: string;
  notes: string | null;
  costCenter: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
}

export default function BudgetsPage() {
  const { message } = App.useApp();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const currentYear = new Date().getFullYear();

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/finance/budgets');
      if (res.ok) setBudgets(await res.json());
      else message.error('Failed to load budgets');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/finance/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Budget created');
        setModalOpen(false);
        form.resetFields();
        fetchBudgets();
      } else {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create budget');
      }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const columns: ColumnsType<Budget> = [
    { title: 'Name', dataIndex: 'name' },
    {
      title: 'Fiscal Year',
      dataIndex: 'fiscalYear',
      width: 110,
      render: (y: number) => <Tag>{y}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (a: number, r) => `${r.currency} ${a.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Cost Center',
      dataIndex: 'costCenter',
      render: (c: { name: string } | null) => c?.name ?? '-',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      render: (d: { name: string } | null) => d?.name ?? '-',
    },
    { title: 'Notes', dataIndex: 'notes', render: (n: string | null) => n ?? '-' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Budget Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Budget
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={budgets}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title="Create Budget"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Budget Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g. IT Operations FY2026" />
          </Form.Item>
          <Form.Item name="fiscalYear" label="Fiscal Year" initialValue={currentYear} rules={[{ required: true }]}>
            <InputNumber min={2020} max={2099} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="Budget Amount" rules={[{ required: true, message: 'Required' }, { type: 'number', min: 0.01, message: 'Must be positive' }]}>
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              prefix="$"
            />
          </Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
              <Select.Option value="GBP">GBP</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
