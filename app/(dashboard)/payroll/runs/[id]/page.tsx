'use client';
import { App, Card, Table, Tag, Button, Statistic, Row, Col, Modal, Form, InputNumber, Select, Popconfirm } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CheckOutlined, DollarOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  processing: 'processing',
  approved: 'success',
  paid: 'green',
};

interface PayrollEntry {
  id: number;
  userId: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  taxAmount: number;
  netPay: number;
  notes: string | null;
  user: { id: number; name: string; email: string; department: { name: string } | null } | null;
}

interface PayrollRun {
  id: number;
  period: string;
  name: string;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  currency: string;
  notes: string | null;
  entries: PayrollEntry[];
}

interface Employee {
  id: number;
  name: string;
  email: string;
}

export default function PayrollRunDetailPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [form] = Form.useForm();

  const fetchRun = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payroll/runs/${id}`);
      if (res.ok) setRun(await res.json());
      else message.error('Failed to load payroll run');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [id, message]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  useEffect(() => {
    fetch('/api/v1/hr/employees?limit=100')
      .then(r => r.json())
      .then(d => setEmployees(d.data ?? []))
      .catch(() => {});
  }, []);

  const handleAddEntry = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/payroll/runs/${id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Entry added');
        setAddModalOpen(false);
        form.resetFields();
        fetchRun();
      } else {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to add entry');
      }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleTransition = async (status: string) => {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/v1/payroll/runs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { message.success(`Run marked as ${status}`); fetchRun(); }
      else { const err = await res.json(); message.error(err?.error?.message ?? 'Failed'); }
    } catch { message.error('Network error'); }
    finally { setTransitioning(false); }
  };

  const existingUserIds = new Set(run?.entries.map(e => e.userId) ?? []);
  const availableEmployees = employees.filter(e => !existingUserIds.has(e.id));

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, e: PayrollEntry) => (
        <div>
          <div style={{ fontWeight: 500 }}>{e.user?.name ?? `User #${e.userId}`}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{e.user?.department?.name ?? '—'}</div>
        </div>
      ),
    },
    {
      title: 'Base Salary',
      dataIndex: 'baseSalary',
      align: 'right' as const,
      render: (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Bonuses',
      dataIndex: 'bonuses',
      align: 'right' as const,
      render: (v: number) => v > 0 ? `+$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      title: 'Deductions',
      dataIndex: 'deductions',
      align: 'right' as const,
      render: (v: number) => v > 0 ? `-$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      align: 'right' as const,
      render: (v: number) => v > 0 ? `-$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      title: 'Net Pay',
      dataIndex: 'netPay',
      align: 'right' as const,
      render: (v: number) => <strong>${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>,
    },
  ];

  const isDraft = run?.status === 'draft';
  const canApprove = run?.status === 'processing';
  const canMarkPaid = run?.status === 'approved';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/payroll/runs')} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{run?.name ?? 'Loading...'}</h2>
          <span style={{ color: '#666' }}>{run?.period}</span>
        </div>
        {run && <Tag color={STATUS_COLOR[run.status] ?? 'default'} style={{ fontSize: 14 }}>{run.status.toUpperCase()}</Tag>}
        <div style={{ display: 'flex', gap: 8 }}>
          {isDraft && (
            <>
              <Button icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>Add Employee</Button>
              <Popconfirm title="Submit for approval?" onConfirm={() => handleTransition('processing')}>
                <Button type="primary" icon={<CheckOutlined />} loading={transitioning}>Submit</Button>
              </Popconfirm>
            </>
          )}
          {canApprove && (
            <Popconfirm title="Approve this payroll run?" onConfirm={() => handleTransition('approved')}>
              <Button type="primary" icon={<CheckOutlined />} loading={transitioning}>Approve</Button>
            </Popconfirm>
          )}
          {canMarkPaid && (
            <Popconfirm title="Mark as paid? This cannot be undone." onConfirm={() => handleTransition('paid')}>
              <Button type="primary" icon={<DollarOutlined />} loading={transitioning} style={{ background: '#52c41a' }}>Mark Paid</Button>
            </Popconfirm>
          )}
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic title="Gross Payroll" value={run?.totalGross ?? 0} precision={2} prefix="$" styles={{ content: { color: '#1677ff' } }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic title="Total Deductions" value={run?.totalDeductions ?? 0} precision={2} prefix="-$" styles={{ content: { color: '#ff4d4f' } }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card loading={loading}>
            <Statistic title="Net Payroll" value={run?.totalNet ?? 0} precision={2} prefix="$" styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
      </Row>

      <Card title={`Payroll Entries (${run?.entries.length ?? 0} employees)`} loading={loading}>
        <Table
          columns={columns}
          dataSource={run?.entries ?? []}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title="Add Employee to Payroll"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleAddEntry} style={{ marginTop: 16 }}>
          <Form.Item name="userId" label="Employee" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select employee"
              options={availableEmployees.map(e => ({ value: e.id, label: e.name }))}
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="baseSalary" label="Base Salary" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} prefix="$" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bonuses" label="Bonuses" initialValue={0}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deductions" label="Deductions" initialValue={0}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="taxAmount" label="Tax Amount" initialValue={0}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
