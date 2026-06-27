'use client';

import { App, Table, Card, Button, Modal, Form, Input, InputNumber, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface Adjustment {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  reason: string;
  notes: string | null;
  createdAt: string;
}

export default function InventoryAdjustmentsPage() {
  const { message } = App.useApp();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchAdjustments = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/adjustments?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.data ?? []);
        setTotal(data.total ?? 0);
      } else { message.error('Failed to load adjustments'); }
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchAdjustments(page); }, [fetchAdjustments, page]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to save');
        return;
      }
      message.success('Adjustment recorded');
      form.resetFields();
      setModalOpen(false);
      fetchAdjustments(1);
    } catch { /* validation error */ }
    finally { setSaving(false); }
  };

  const columns: ColumnsType<Adjustment> = [
    { title: 'Item', dataIndex: 'description' },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      width: 130,
      align: 'right' as const,
      render: (q: number, r) => (
        <Tag color={q > 0 ? 'green' : 'red'}>
          {q > 0 ? '+' : ''}{q.toFixed(2)} {r.unit}
        </Tag>
      ),
    },
    { title: 'Reason', dataIndex: 'reason' },
    { title: 'Notes', dataIndex: 'notes', render: (n: string | null) => n ?? '-' },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 180,
      render: (d: string) => new Date(d).toLocaleString(),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Stock Adjustments</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Adjustment
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={adjustments}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: p => setPage(p),
            showTotal: t => `${t} adjustments`,
          }}
          size="small"
        />
      </Card>

      <Modal
        title="New Stock Adjustment"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="description" label="Item Description" rules={[{ required: true }]}>
            <Input placeholder="e.g. Office Chair" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity (positive = add, negative = remove)"
            rules={[{ required: true }, { type: 'number', message: 'Must be a number' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 5 or -3" />
          </Form.Item>
          <Form.Item name="unit" label="Unit" initialValue="units">
            <Input placeholder="units / kg / boxes" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input placeholder="e.g. Inventory count correction" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
