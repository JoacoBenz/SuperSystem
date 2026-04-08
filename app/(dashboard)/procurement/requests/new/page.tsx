'use client';

import { Card, Form, Input, Select, Button, InputNumber, Space, Typography, App, Divider, AutoComplete, Modal, Table } from 'antd';
import { PlusOutlined, MinusCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { URGENCY_OPTIONS } from '@/src/modules/procurement/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<'draft' | 'submit' | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [templateModal, setTemplateModal] = useState(false);
  const templateLoaded = useRef(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    fetch('/api/v1/procurement/vendors?active=true&limit=100').then(r => r.json()).then(d => setVendors(d.data ?? [])).catch(() => {});
    fetch('/api/v1/procurement/cost-centers?active=true&limit=100').then(r => r.json()).then(d => setCostCenters(d.data ?? [])).catch(() => {});
    fetch('/api/v1/procurement/saved-items').then(r => r.json()).then(d => setSavedItems(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Load from template if templateId is in URL
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (templateId && !templateLoaded.current) {
      templateLoaded.current = true;
      fetch(`/api/v1/procurement/purchase-requests/${templateId}`)
        .then(r => r.json())
        .then(data => {
          const pr = data.data ?? data;
          if (pr) {
            form.setFieldsValue({
              title: pr.title,
              description: pr.description,
              justification: pr.justification,
              urgency: pr.urgency,
              vendorId: pr.vendorId,
              costCenterId: pr.costCenterId,
              items: pr.items?.map((item: any) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unit: item.unit,
                estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : undefined,
              })) ?? [{}],
            });
            message.info('Loaded from template');
          }
        })
        .catch(() => { templateLoaded.current = false; });
    }
  }, [searchParams, form, message]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/v1/procurement/purchase-requests?limit=20&sort=createdAt&order=desc');
      const json = await res.json();
      setTemplates(json.data ?? []);
    } catch {} finally {
      setTemplatesLoading(false);
    }
  }, []);

  function loadTemplate(pr: any) {
    form.setFieldsValue({
      title: pr.title,
      description: pr.description,
      justification: pr.justification,
      urgency: pr.urgency,
      vendorId: pr.vendorId,
      costCenterId: pr.costCenterId,
      items: pr.items?.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : undefined,
      })) ?? [{}],
    });
    setTemplateModal(false);
    message.success('Template loaded');
  }

  const savedItemOptions = savedItems.map(item => ({
    value: item.description,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{item.description}</span>
        <Text type="secondary" style={{ fontSize: 12 }}>used {item.useCount}x</Text>
      </div>
    ),
  }));

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

  function onSelectSavedItem(value: string, fieldName: number) {
    const savedItem = savedItems.find(i => i.description === value);
    if (savedItem) {
      const items = form.getFieldValue('items') || [];
      items[fieldName] = {
        ...items[fieldName],
        description: savedItem.description,
        unit: savedItem.unit,
        estimatedPrice: savedItem.estimatedPrice ? Number(savedItem.estimatedPrice) : undefined,
      };
      form.setFieldsValue({ items });
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>New Purchase Request</Title>
        <Button
          icon={<CopyOutlined />}
          onClick={() => { setTemplateModal(true); fetchTemplates(); }}
        >
          From Template
        </Button>
      </Space>

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
          {savedItems.length > 0 && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Start typing to see previously used items
            </Text>
          )}

          <Form.List name="items" rules={[{
            validator: async (_, items) => {
              if (!items || items.length < 1) throw new Error('At least one item required');
            },
          }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }} wrap>
                    <Form.Item {...restField} name={[name, 'description']} rules={[{ required: true, message: 'Required' }]}>
                      <AutoComplete
                        options={savedItemOptions}
                        placeholder="Item description"
                        style={{ width: 250 }}
                        filterOption={(input, option) =>
                          (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        onSelect={(value) => onSelectSavedItem(value, name)}
                      />
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

      <Modal
        title="Use Previous Request as Template"
        open={templateModal}
        onCancel={() => setTemplateModal(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={templates}
          rowKey="id"
          loading={templatesLoading}
          size="small"
          pagination={false}
          columns={[
            { title: '#', dataIndex: 'number', key: 'number', width: 100 },
            { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
            {
              title: 'Items', key: 'items', width: 80,
              render: (_: any, r: any) => r.items?.length ?? 0,
            },
            {
              title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 100,
              render: (d: string) => new Date(d).toLocaleDateString(),
            },
            {
              title: '', key: 'action', width: 80,
              render: (_: any, record: any) => (
                <Button size="small" type="link" onClick={() => loadTemplate(record)}>
                  Use
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
