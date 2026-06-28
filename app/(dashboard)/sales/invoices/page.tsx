'use client';
import { App, Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Tag, Row, Col, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

const STATUS_COLOR: Record<string, string> = { draft: 'default', issued: 'processing', paid: 'success', void: 'error' };

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  customerName: string;
  total: number;
  paidAmount: number;
  outstanding: number;
  currency: string;
  dueDate: string;
}
interface Customer { id: number; name: string; }

export default function ARInvoicesPage() {
  const { message } = App.useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/sales/ar-invoices?${params}`);
      if (res.ok) { const d = await res.json(); setInvoices(d.data ?? []); }
      else message.error('Failed to load invoices');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    fetch('/api/v1/sales/customers?limit=100').then(r => r.json()).then(d => setCustomers(d.data ?? [])).catch(() => {});
  }, []);

  const act = async (inv: Invoice, action: 'issue' | 'void') => {
    try {
      const res = await fetch(`/api/v1/sales/ar-invoices/${inv.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      if (res.ok) { message.success(`Invoice ${action === 'issue' ? 'issued' : 'voided'}`); fetchInvoices(); }
      else { const e = await res.json(); message.error(e?.error?.message ?? 'Action failed'); }
    } catch { message.error('Network error'); }
  };

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = { ...values, dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined };
      const res = await fetch('/api/v1/sales/ar-invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) { message.success('Invoice created (draft)'); setCreateOpen(false); form.resetFields(); fetchInvoices(); }
      else { const e = await res.json(); message.error(e?.error?.message ?? 'Failed to create'); }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handlePay = async (values: any) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/sales/ar-invoices/${selected.id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      });
      if (res.ok) { message.success('Payment recorded'); setPayOpen(false); payForm.resetFields(); setSelected(null); fetchInvoices(); }
      else { const e = await res.json(); message.error(e?.error?.message ?? 'Payment failed'); }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const money = (v: number, c: string) => `${c} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const columns: ColumnsType<Invoice> = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', width: 120 },
    { title: 'Customer', dataIndex: 'customerName' },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s.toUpperCase()}</Tag> },
    { title: 'Total', dataIndex: 'total', align: 'right', render: (v: number, r) => money(v, r.currency) },
    { title: 'Paid', dataIndex: 'paidAmount', align: 'right', render: (v: number, r) => money(v, r.currency) },
    { title: 'Outstanding', dataIndex: 'outstanding', align: 'right', render: (v: number, r) => money(v, r.currency) },
    { title: 'Due', dataIndex: 'dueDate', width: 110, render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: 'Actions', key: 'actions', width: 230, render: (_: unknown, inv) => (
        <Space size="small">
          {inv.status === 'draft' && <Button size="small" type="primary" onClick={() => act(inv, 'issue')}>Issue</Button>}
          {(inv.status === 'issued') && <Button size="small" icon={<DollarOutlined />} onClick={() => { setSelected(inv); payForm.setFieldsValue({ amount: inv.outstanding, method: 'bank' }); setPayOpen(true); }}>Record Payment</Button>}
          {(inv.status === 'draft' || inv.status === 'issued') && (
            <Popconfirm title="Void this invoice?" onConfirm={() => act(inv, 'void')}><Button size="small" danger>Void</Button></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Customer Invoices (AR)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select placeholder="Filter by status" style={{ width: 160 }} allowClear value={statusFilter} onChange={setStatusFilter}
            options={['draft', 'issued', 'paid', 'void'].map(s => ({ value: s, label: s.toUpperCase() }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New Invoice</Button>
        </div>
      </div>

      <Table columns={columns} dataSource={invoices} rowKey="id" loading={loading} size="small" />

      <Modal title="New Customer Invoice" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden width={640}>
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select customer" options={customers.map(c => ({ value: c.id, label: c.name }))}
                  filterOption={(i, o) => (o?.label as string ?? '').toLowerCase().includes(i.toLowerCase())} />
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item name="currency" label="Currency" initialValue="USD"><Select options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]} /></Form.Item></Col>
            <Col span={6}><Form.Item name="dueDate" label="Due Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item label="Line Items" required>
            <Form.List name="items" initialValue={[{ description: '', quantity: 1, unitPrice: 0 }]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                      <Col span={11}><Form.Item name={[name, 'description']} noStyle rules={[{ required: true }]}><Input placeholder="Description" /></Form.Item></Col>
                      <Col span={5}><Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true }]}><InputNumber min={0.01} placeholder="Qty" style={{ width: '100%' }} /></Form.Item></Col>
                      <Col span={6}><Form.Item name={[name, 'unitPrice']} noStyle rules={[{ required: true }]}><InputNumber min={0.01} precision={2} placeholder="Unit price" prefix="$" style={{ width: '100%' }} /></Form.Item></Col>
                      <Col span={2}>{fields.length > 1 && <Button icon={<DeleteOutlined />} size="small" danger onClick={() => remove(name)} />}</Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add({ description: '', quantity: 1, unitPrice: 0 })} block icon={<PlusOutlined />}>Add Line</Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="taxAmount" label="Tax Amount" initialValue={0}><InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={16}><Form.Item name="notes" label="Notes"><Input.TextArea rows={1} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={`Record Payment — ${selected?.invoiceNumber ?? ''}`} open={payOpen} onCancel={() => { setPayOpen(false); payForm.resetFields(); setSelected(null); }} onOk={() => payForm.submit()} confirmLoading={submitting} destroyOnHidden width={420}>
        <Form form={payForm} layout="vertical" onFinish={handlePay} style={{ marginTop: 16 }}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="method" label="Method" initialValue="bank"><Select options={['bank', 'cash', 'card', 'transfer'].map(m => ({ value: m, label: m.toUpperCase() }))} /></Form.Item>
          <Form.Item name="reference" label="Reference"><Input placeholder="Optional" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
