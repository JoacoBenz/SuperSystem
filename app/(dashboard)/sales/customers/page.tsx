'use client';
import { App, Table, Button, Modal, Form, Input, Tag } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  active: boolean;
  orderCount: number;
}

export default function CustomersPage() {
  const { message } = App.useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/v1/sales/customers?${params}`);
      if (res.ok) { const d = await res.json(); setCustomers(d.data ?? []); }
      else message.error('Failed to load customers');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/sales/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Customer created');
        setModalOpen(false);
        form.resetFields();
        fetchCustomers();
      } else {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create customer');
      }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const columns: ColumnsType<Customer> = [
    { title: 'Name', dataIndex: 'name', render: (n: string) => <><UserOutlined style={{ marginRight: 6 }} />{n}</> },
    { title: 'Email', dataIndex: 'email', render: (v: string | null) => v ?? '—' },
    { title: 'Phone', dataIndex: 'phone', render: (v: string | null) => v ?? '—' },
    { title: 'Tax ID', dataIndex: 'taxId', render: (v: string | null) => v ?? '—' },
    { title: 'Orders', dataIndex: 'orderCount', align: 'right', width: 80 },
    {
      title: 'Status',
      dataIndex: 'active',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Customers</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={fetchCustomers}
            style={{ width: 240 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Customer
          </Button>
        </div>
      </div>

      <Table columns={columns} dataSource={customers} rowKey="id" loading={loading} size="small" />

      <Modal
        title="New Customer"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Company / Name" rules={[{ required: true }]}>
            <Input placeholder="Acme Corporation" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
            <Input placeholder="billing@acme.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="+1 555 000 0000" />
          </Form.Item>
          <Form.Item name="taxId" label="Tax ID / VAT">
            <Input placeholder="US123456789" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
