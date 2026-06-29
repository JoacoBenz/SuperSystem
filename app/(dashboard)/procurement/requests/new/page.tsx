'use client';

import { Card, Form, Input, Select, Button, InputNumber, Space, Typography, App, Divider } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { URGENCY_OPTIONS } from '@/src/modules/procurement/types';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<'draft' | 'submit' | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/v1/procurement/vendors?active=true&limit=100').then(r => r.json()).then(d => setVendors(d.data ?? [])).catch(() => {});
    fetch('/api/v1/procurement/cost-centers?active=true&limit=100').then(r => r.json()).then(d => setCostCenters(d.data ?? [])).catch(() => {});
    fetch('/api/v1/inventory/products?limit=200').then(r => r.json()).then(d => setProducts(d.data ?? [])).catch(() => {});
  }, []);

  async function handleSubmit(action: 'draft' | 'submit') {
    try {
      const values = await form.validateFields();
      setLoading(action);

      const res = await fetch('/api/v1/procurement/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = err?.error?.details?.map((d: any) => `${d.field}: ${d.message}`).join(', ') ?? err?.error?.message ?? 'Error';
        message.error(msg);
        return;
      }

      message.success(action === 'draft' ? 'Draft saved' : 'Request submitted');
      router.push('/procurement/requests');
    } catch {
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={4}>New Purchase Request</Title>

      <Card>
        <Form form={form} layout="vertical" initialValues={{ urgency: 'normal', items: [{}] }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, min: 3 }]}>
            <Input placeholder="Brief title for this request" />
          </Form.Item>

          <Form.Item name="description" label="Description" rules={[{ required: true, min: 10 }]}>
            <TextArea rows={3} placeholder="What do you need?" />
          </Form.Item>

          <Form.Item name="justification" label="Justification" rules={[{ required: true, min: 10 }]}>
            <TextArea rows={2} placeholder="Why is this needed?" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="urgency" label="Urgency" style={{ minWidth: 150 }}>
              <Select options={URGENCY_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
            </Form.Item>

            <Form.Item name="vendorId" label="Preferred Vendor" style={{ minWidth: 200 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Select vendor"
                options={vendors.map(v => ({ value: v.id, label: v.name }))}
              />
            </Form.Item>

            <Form.Item name="costCenterId" label="Cost Center" style={{ minWidth: 200 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Select cost center"
                options={costCenters.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
              />
            </Form.Item>
          </Space>

          <Divider>Items</Divider>

          <Form.List name="items" rules={[{
            validator: async (_, items) => {
              if (!items || items.length < 1) throw new Error('At least one item required');
            },
          }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }} wrap>
                    <Form.Item {...restField} name={[name, 'productId']}>
                      <Select
                        allowClear showSearch placeholder="Product (optional)" style={{ width: 200 }}
                        optionFilterProp="label"
                        options={products.map(p => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
                        onChange={(val) => {
                          const prod = products.find(p => p.id === val);
                          if (prod) form.setFields([
                            { name: ['items', name, 'description'], value: prod.name },
                            { name: ['items', name, 'unit'], value: prod.unitOfMeasure },
                            { name: ['items', name, 'estimatedPrice'], value: prod.costPrice ?? undefined },
                          ]);
                        }}
                      />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'description']} rules={[{ required: true, message: 'Required' }]}>
                      <Input placeholder="Item description" style={{ width: 250 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true, message: 'Required' }]}>
                      <InputNumber placeholder="Qty" min={0.01} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'unit']} initialValue="units">
                      <Input placeholder="Unit" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'estimatedPrice']}>
                      <InputNumber placeholder="Est. price" min={0} prefix="$" style={{ width: 130 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
                  Add Item
                </Button>
              </>
            )}
          </Form.List>

          <Space>
            <Button onClick={() => handleSubmit('draft')} loading={loading === 'draft'}>
              Save as Draft
            </Button>
            <Button type="primary" onClick={() => handleSubmit('submit')} loading={loading === 'submit'}>
              Submit for Review
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
