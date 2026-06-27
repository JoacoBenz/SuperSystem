'use client';
import { App, Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default', confirmed: 'processing', shipped: 'warning', delivered: 'success', cancelled: 'error',
};

interface SalesOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  customer: { id: number; name: string };
  createdAt: string;
}

interface Customer { id: number; name: string; }

export default function SalesOrdersPage() {
  const { message } = App.useApp();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/sales/orders?${params}`);
      if (res.ok) { const d = await res.json(); setOrders(d.data ?? []); }
      else message.error('Failed to load orders');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    fetch('/api/v1/sales/customers?limit=100')
      .then(r => r.json())
      .then(d => setCustomers(d.data ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Order created');
        setModalOpen(false);
        form.resetFields();
        fetchOrders();
      } else {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create order');
      }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const columns: ColumnsType<SalesOrder> = [
    { title: 'Order #', dataIndex: 'orderNumber', width: 110 },
    { title: 'Customer', key: 'customer', render: (_: unknown, o) => o.customer?.name },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Items', dataIndex: 'itemCount', align: 'right', width: 70 },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      align: 'right',
      render: (v: number, o) => `${o.currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 110,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Sales Orders</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            placeholder="Filter by status"
            style={{ width: 160 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            options={['draft','confirmed','shipped','delivered','cancelled'].map(s => ({ value: s, label: s.toUpperCase() }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Order
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        size="small"
        onRow={o => ({ style: { cursor: 'pointer' } })}
      />

      <Modal
        title="New Sales Order"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select customer"
              options={customers.map(c => ({ value: c.id, label: c.name }))}
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="USD">
            <Select options={[{value:'USD',label:'USD'},{value:'EUR',label:'EUR'},{value:'GBP',label:'GBP'}]} />
          </Form.Item>
          <Form.Item label="Line Items" required>
            <Form.List name="items" initialValue={[{ description: '', quantity: 1, unitPrice: 0 }]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Row key={key} gutter={8} style={{ marginBottom: 8 }} align="middle">
                      <Col span={10}>
                        <Form.Item name={[name, 'description']} noStyle rules={[{ required: true }]}>
                          <Input placeholder="Description" />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true }]}>
                          <InputNumber min={0.01} placeholder="Qty" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={7}>
                        <Form.Item name={[name, 'unitPrice']} noStyle rules={[{ required: true }]}>
                          <InputNumber min={0.01} precision={2} placeholder="Unit price" prefix="$" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        {fields.length > 1 && (
                          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => remove(name)} />
                        )}
                      </Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add({ description: '', quantity: 1, unitPrice: 0 })} block icon={<PlusOutlined />}>
                    Add Line
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
