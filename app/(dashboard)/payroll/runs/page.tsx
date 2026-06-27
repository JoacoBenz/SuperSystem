'use client';
import { App, Table, Button, Modal, Form, Input, Tag, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  processing: 'processing',
  approved: 'success',
  paid: 'green',
};

interface PayrollRun {
  id: number;
  period: string;
  name: string;
  status: string;
  totalGross: number;
  totalNet: number;
  currency: string;
  employeeCount: number;
  createdAt: string;
}

export default function PayrollRunsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/payroll/runs');
      if (res.ok) setRuns(await res.json());
      else message.error('Failed to load payroll runs');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Payroll run created');
        setModalOpen(false);
        form.resetFields();
        fetchRuns();
      } else {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create run');
      }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value: val, label: val };
  });

  const columns: ColumnsType<PayrollRun> = [
    { title: 'Period', dataIndex: 'period', width: 100 },
    { title: 'Name', dataIndex: 'name' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Employees', dataIndex: 'employeeCount', width: 110, align: 'right' },
    {
      title: 'Gross',
      dataIndex: 'totalGross',
      align: 'right',
      render: (v: number, r) => `${r.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Net Pay',
      dataIndex: 'totalNet',
      align: 'right',
      render: (v: number, r) => `${r.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, r) => (
        <Button size="small" onClick={e => { e.stopPropagation(); router.push(`/payroll/runs/${r.id}`); }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Payroll Runs</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Run
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={runs}
        rowKey="id"
        loading={loading}
        size="small"
        onRow={r => ({ onClick: () => router.push(`/payroll/runs/${r.id}`), style: { cursor: 'pointer' } })}
      />

      <Modal
        title="Create Payroll Run"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="period" label="Period (YYYY-MM)" rules={[{ required: true }]}>
            <Select options={periodOptions} placeholder="Select period" />
          </Form.Item>
          <Form.Item name="name" label="Run Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. June 2026 Payroll" />
          </Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
              <Select.Option value="GBP">GBP</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
