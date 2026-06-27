'use client';

import { Table, Button, Typography, Row, Col, Tag, Modal, Form, Input, InputNumber, Switch, Select, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

export default function ReceptionsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prItems, setPrItems] = useState<any[]>([]);
  const [prLoading, setPrLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    try {
      const res = await fetch(`/api/v1/procurement/receptions?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrChange = async (prId: string) => {
    if (!prId) { setPrItems([]); return; }
    setPrLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests/${prId}`);
      const json = await res.json();
      const pr = json.data ?? json;
      setPrItems(pr.items ?? []);
      // Pre-fill items in form
      form.setFieldValue('items', (pr.items ?? []).map((item: any) => ({
        purchaseRequestItemId: item.id,
        description: item.description,
        quantityReceived: Number(item.quantity),
        conforming: true,
        notes: '',
      })));
    } catch {
      setPrItems([]);
    } finally {
      setPrLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/procurement/receptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: Number(values.purchaseRequestId),
          conforming: values.conforming ?? true,
          issueType: values.issueType || null,
          notes: values.notes || null,
          items: values.items?.map((item: any) => ({
            purchaseRequestItemId: item.purchaseRequestItemId,
            quantityReceived: Number(item.quantityReceived),
            conforming: item.conforming ?? true,
            notes: item.notes || null,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to record reception');
        return;
      }
      message.success('Reception recorded successfully');
      setModalOpen(false);
      form.resetFields();
      setPrItems([]);
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'PR Number', key: 'prNumber', width: 130,
      render: (_: any, record: any) => record.purchaseRequest?.number ?? '-',
    },
    {
      title: 'PR Title', key: 'prTitle',
      render: (_: any, record: any) => record.purchaseRequest?.title ?? '-',
      ellipsis: true,
    },
    {
      title: 'Receiver', dataIndex: 'receiver', key: 'receiver', width: 150,
      render: (u: any) => u?.name ?? '-',
    },
    {
      title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'Conforming', dataIndex: 'conforming', key: 'conforming', width: 120,
      render: (c: boolean) => <Tag color={c ? 'green' : 'orange'}>{c ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Issue Type', dataIndex: 'issueType', key: 'issueType', width: 140,
      render: (t: string | null) => t ? <Tag color="orange">{t}</Tag> : '-',
    },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Receptions</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Reception
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page, pageSize, total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: t => `${t} total`,
          showSizeChanger: true,
        }}
        onRow={(record) => ({
          onClick: () => record.purchaseRequestId && router.push(`/procurement/requests/${record.purchaseRequestId}`),
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="Record Reception"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setPrItems([]); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="purchaseRequestId" label="Purchase Request ID" rules={[{ required: true, message: 'Required' }]}>
            <Input
              placeholder="Enter PR ID (e.g. 1)"
              onChange={e => handlePrChange(e.target.value)}
            />
          </Form.Item>

          <Form.Item name="conforming" label="Conforming" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.Item name="issueType" label="Issue Type">
            <Select allowClear placeholder="Select if non-conforming">
              <Select.Option value="damaged">Damaged</Select.Option>
              <Select.Option value="wrong_item">Wrong Item</Select.Option>
              <Select.Option value="incomplete">Incomplete</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          {prItems.length > 0 && (
            <>
              <Title level={5}>Items</Title>
              <Form.List name="items">
                {(fields) => fields.map((field) => (
                  <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'purchaseRequestItemId']} hidden><Input /></Form.Item>
                    <Row gutter={8}>
                      <Col span={10}>
                        <Form.Item label="Description" style={{ margin: 0 }}>
                          <Input value={prItems[field.name]?.description} disabled />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name={[field.name, 'quantityReceived']} label="Qty Received" style={{ margin: 0 }} rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name={[field.name, 'conforming']} label="OK" valuePropName="checked" initialValue={true} style={{ margin: 0 }}>
                          <Switch size="small" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name={[field.name, 'notes']} label="Notes" style={{ margin: 0 }}>
                          <Input size="small" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}
              </Form.List>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
