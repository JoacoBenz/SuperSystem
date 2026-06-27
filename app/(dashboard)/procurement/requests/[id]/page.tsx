'use client';

import { App, Button, Card, Descriptions, Typography, Table, Tag, Modal, Input, InputNumber, Select, DatePicker, Form, Popconfirm, Space, Spin } from 'antd';
import { PaperClipOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkflowTimeline } from '@/components/ui/WorkflowTimeline';
import { PURCHASE_REQUEST_STATUS_LABELS, PURCHASE_REQUEST_STATUS_COLORS } from '@/src/modules/procurement/types';

const { Title, Text } = Typography;

export default function PurchaseRequestDetailPage() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesModal, setNotesModal] = useState<{ action: string; label: string } | null>(null);
  const [notes, setNotes] = useState('');

  // PO modal state
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poForm] = Form.useForm();
  const [poSaving, setPoSaving] = useState(false);

  // Quotations state
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [quotationForm] = Form.useForm();
  const [quotationSaving, setQuotationSaving] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}`);
      const data = await res.json();
      setPr(data ?? null);
    } catch {} finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchQuotations = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/quotations`);
      if (res.ok) setQuotations(await res.json());
    } catch {}
  }, [id]);

  useEffect(() => { if (id) fetchQuotations(); }, [fetchQuotations]);

  const fetchAttachments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/attachments`);
      if (res.ok) setAttachments(await res.json());
    } catch {}
  }, [id]);

  useEffect(() => { if (id) fetchAttachments(); }, [fetchAttachments]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined, version: pr?.version }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Action failed');
        return;
      }

      message.success(`Action "${action}" completed`);
      setNotesModal(null);
      setNotes('');
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPurchase = async () => {
    try {
      const values = await poForm.validateFields();
      setPoSaving(true);
      const res = await fetch('/api/v1/procurement/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: parseInt(id as string),
          ...values,
          purchaseDate: values.purchaseDate.format('YYYY-MM-DD'),
          totalAmount: Number(values.totalAmount),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to record purchase');
        return;
      }
      message.success('Purchase recorded');
      setPoModalOpen(false);
      poForm.resetFields();
      fetchData();
    } catch {} finally {
      setPoSaving(false);
    }
  };

  const handleAddQuotation = async () => {
    try {
      const values = await quotationForm.validateFields();
      setQuotationSaving(true);
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, amount: Number(values.amount) }),
      });
      if (!res.ok) { message.error('Failed to add quotation'); return; }
      message.success('Quotation added');
      setQuotationModalOpen(false);
      quotationForm.resetFields();
      fetchQuotations();
    } catch {} finally { setQuotationSaving(false); }
  };

  const handleSelectQuotation = async (qid: number) => {
    const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/quotations/${qid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected: true }),
    });
    if (!res.ok) { message.error('Failed to select quotation'); return; }
    message.success('Quotation selected');
    fetchQuotations();
  };

  const handleDeleteQuotation = async (qid: number) => {
    const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/quotations/${qid}`, { method: 'DELETE' });
    if (!res.ok) { message.error('Failed to delete'); return; }
    fetchQuotations();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) { message.error('Upload failed'); return; }
      message.success('File uploaded');
      fetchAttachments();
    } catch { message.error('Upload failed'); }
    finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/attachments/${attachmentId}`, { method: 'DELETE' });
    if (!res.ok) { message.error('Failed to delete'); return; }
    fetchAttachments();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!pr) return <div><Title level={4}>Purchase Request not found</Title></div>;

  const actionsNeedingNotes = ['reject', 'return', 'validate', 'approve'];

  const timelineEntries = [
    { state: 'draft', label: 'Created', timestamp: pr.createdAt },
    ...(pr.submittedAt ? [{ state: 'submitted', label: 'Submitted', timestamp: pr.submittedAt }] : []),
    ...(pr.validatedAt ? [{ state: 'validated', label: 'Validated', timestamp: pr.validatedAt }] : []),
    ...(pr.approvedAt ? [{ state: 'approved', label: 'Approved', timestamp: pr.approvedAt }] : []),
    ...(pr.rejectedAt ? [{ state: 'rejected', label: 'Rejected', timestamp: pr.rejectedAt }] : []),
    ...(pr.processedAt ? [{ state: 'processed', label: 'Processed', timestamp: pr.processedAt }] : []),
    ...(['purchased', 'received', 'received_with_issues', 'closed'].includes(pr.status) && pr.orders?.length
      ? [{ state: 'purchased', label: 'Purchased', timestamp: pr.orders[0]?.createdAt }]
      : []),
    ...(pr.receptions?.length
      ? [{ state: 'received', label: 'Received', timestamp: pr.receptions[0]?.createdAt }]
      : []),
    ...(pr.status === 'closed'
      ? [{ state: 'closed', label: 'Closed', timestamp: pr.updatedAt }]
      : []),
  ];

  // Available actions based on current status
  const availableActions: Array<{ action: string; label: string }> = [];
  const s = pr.status;
  if (s === 'draft' || s === 'returned_by_validator' || s === 'returned_by_approver') {
    availableActions.push({ action: 'submit', label: 'Submit' });
  }
  if (s === 'submitted') {
    availableActions.push({ action: 'validate', label: 'Validate' });
    availableActions.push({ action: 'return', label: 'Return' });
  }
  if (s === 'validated') {
    availableActions.push({ action: 'approve', label: 'Approve' });
    availableActions.push({ action: 'return', label: 'Return' });
    availableActions.push({ action: 'reject', label: 'Reject' });
  }
  if (s === 'approved' || s === 'in_procurement') {
    availableActions.push({ action: 'process', label: 'Process' });
  }
  if (s === 'in_procurement') {
    availableActions.push({ action: 'schedule_payment', label: 'Schedule Payment' });
  }
  if (s === 'approved' || s === 'in_procurement' || s === 'payment_scheduled') {
    availableActions.push({ action: 'record_purchase', label: 'Record Purchase' });
  }
  if (s === 'received' || s === 'received_with_issues') {
    availableActions.push({ action: 'close', label: 'Close' });
  }
  if (['draft', 'submitted', 'validated', 'approved', 'in_procurement', 'payment_scheduled'].includes(s)) {
    availableActions.push({ action: 'cancel', label: 'Cancel' });
  }

  const itemColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', render: (v: string) => Number(v) },
    { title: 'Unit', dataIndex: 'unit', key: 'unit' },
    { title: 'Est. Price', dataIndex: 'estimatedPrice', key: 'estimatedPrice', render: (v: string | null) => v ? `$${Number(v).toLocaleString()}` : '-' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{pr.number}</Title>
        <StatusBadge status={pr.status} labels={PURCHASE_REQUEST_STATUS_LABELS} colors={PURCHASE_REQUEST_STATUS_COLORS} />
      </Space>

      <Card>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Title" span={2}>{pr.title}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{pr.description}</Descriptions.Item>
          <Descriptions.Item label="Justification" span={2}>{pr.justification}</Descriptions.Item>
          <Descriptions.Item label="Urgency">{pr.urgency}</Descriptions.Item>
          <Descriptions.Item label="Estimated Total">{pr.estimatedTotal ? `$${Number(pr.estimatedTotal).toLocaleString()}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{pr.vendor?.name ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Cost Center">{pr.costCenter ? `${pr.costCenter.code} - ${pr.costCenter.name}` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Items" style={{ marginTop: 16 }}>
        <Table columns={itemColumns} dataSource={pr.items ?? []} rowKey="id" pagination={false} size="small" />
      </Card>

      <Card
        title="Attachments"
        style={{ marginTop: 16 }}
        extra={
          <Button
            size="small"
            icon={<PaperClipOutlined />}
            loading={uploadingFile}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload File
          </Button>
        }
      >
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
        {attachments.length === 0 ? (
          <Text type="secondary">No attachments yet.</Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {attachments.map((att: any) => (
              <Space key={att.id} style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space>
                  <PaperClipOutlined />
                  <a href={`/api/v1/procurement/purchase-requests/${id}/attachments/${att.id}/download`} target="_blank" rel="noreferrer">
                    {att.fileName}
                  </a>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {att.fileSize ? `(${Math.round(att.fileSize / 1024)} KB)` : ''}
                  </Text>
                </Space>
                <Popconfirm title="Delete this file?" onConfirm={() => handleDeleteAttachment(att.id)}>
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ))}
          </Space>
        )}
      </Card>

      <Card
        title="Vendor Quotations"
        style={{ marginTop: 16 }}
        extra={
          !['purchased','received','received_with_issues','rejected','cancelled','closed'].includes(pr.status) && (
            <Button size="small" icon={<PlusOutlined />} onClick={() => setQuotationModalOpen(true)}>
              Add Quotation
            </Button>
          )
        }
      >
        {quotations.length === 0 ? (
          <Text type="secondary">No quotations added yet.</Text>
        ) : (
          <Table
            size="small"
            dataSource={quotations}
            rowKey="id"
            pagination={false}
            columns={[
              { title: 'Vendor', dataIndex: 'vendorName', key: 'vendorName' },
              { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => `$${Number(v).toLocaleString()}` },
              { title: 'Valid Until', dataIndex: 'validUntil', key: 'validUntil', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '-' },
              { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (v: string | null) => v ?? '-' },
              {
                title: 'Selected',
                dataIndex: 'selected',
                key: 'selected',
                render: (v: boolean) => v ? <Tag color="green">Selected</Tag> : null,
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_: any, row: any) => (
                  <Space size="small">
                    {!row.selected && <Button size="small" onClick={() => handleSelectQuotation(row.id)}>Select</Button>}
                    <Popconfirm title="Delete this quotation?" onConfirm={() => handleDeleteQuotation(row.id)}>
                      <Button size="small" danger>Delete</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="Add Quotation"
        open={quotationModalOpen}
        onOk={handleAddQuotation}
        onCancel={() => setQuotationModalOpen(false)}
        confirmLoading={quotationSaving}
      >
        <Form form={quotationForm} layout="vertical">
          <Form.Item name="vendorName" label="Vendor Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber prefix="$" style={{ width: '100%' }} min={0.01} />
          </Form.Item>
          <Form.Item name="validUntil" label="Valid Until">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Card title="Workflow" style={{ marginTop: 16 }}>
        <WorkflowTimeline
          entries={timelineEntries}
          currentState={pr.status}
          availableActions={availableActions}
          loading={actionLoading}
          onAction={(action) => {
            if (action === 'record_purchase') {
              poForm.setFieldsValue({ vendorName: pr?.vendor?.name ?? '' });
              setPoModalOpen(true);
            } else if (actionsNeedingNotes.includes(action)) {
              const label = availableActions.find(a => a.action === action)?.label ?? action;
              setNotesModal({ action, label });
            } else {
              handleAction(action);
            }
          }}
        />
      </Card>

      <Modal
        title={notesModal?.label}
        open={!!notesModal}
        onOk={() => notesModal && handleAction(notesModal.action)}
        onCancel={() => { setNotesModal(null); setNotes(''); }}
        confirmLoading={actionLoading}
      >
        <Input.TextArea
          rows={3}
          placeholder="Add notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Modal>

      <Modal
        title="Record Purchase"
        open={poModalOpen}
        onOk={handleRecordPurchase}
        onCancel={() => { setPoModalOpen(false); poForm.resetFields(); }}
        confirmLoading={poSaving}
        width={520}
      >
        <Form form={poForm} layout="vertical">
          <Form.Item name="vendorName" label="Vendor Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="totalAmount" label="Total Amount" rules={[{ required: true }]}>
            <InputNumber prefix="$" style={{ width: '100%' }} min={0.01} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
            <Select options={[
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cash', label: 'Cash' },
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'check', label: 'Check' },
              { value: 'other', label: 'Other' },
            ]} />
          </Form.Item>
          <Form.Item name="purchaseDate" label="Purchase Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="invoiceNumber" label="Invoice Number">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
