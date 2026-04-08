'use client';

import {
  Card, Descriptions, Typography, Table, App, Modal, Input, Space, Spin, Button, Result,
  Form, DatePicker, InputNumber, Select, Switch, Divider,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkflowTimeline } from '@/components/ui/WorkflowTimeline';
import { PURCHASE_REQUEST_STATUS_LABELS, PURCHASE_REQUEST_STATUS_COLORS } from '@/src/modules/procurement/types';

const { Title, Text } = Typography;

interface AvailableAction {
  action: string;
  label: string;
  permitted: boolean;
}

const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  submit: 'Request submitted for review',
  validate: 'Request validated successfully',
  return_to_requester: 'Request returned to requester',
  approve: 'Request approved',
  reject: 'Request rejected',
  start_procurement: 'Procurement process started',
  schedule_payment: 'Payment scheduled successfully',
  record_purchase: 'Purchase recorded successfully',
  record_reception: 'Reception recorded successfully',
  escalate_issue: 'Issue escalated for resolution',
  return_to_vendor: 'Returned to vendor — awaiting redelivery',
  close: 'Request closed',
  cancel: 'Request cancelled',
};

const TERMINAL_STATES = ['rejected', 'cancelled', 'closed'];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const ISSUE_TYPES = [
  { value: 'damaged', label: 'Damaged goods' },
  { value: 'missing_items', label: 'Missing items' },
  { value: 'wrong_items', label: 'Wrong items' },
  { value: 'quality', label: 'Quality issues' },
  { value: 'other', label: 'Other' },
];

type ActiveModal =
  | { type: 'notes'; action: string; label: string }
  | { type: 'schedule_payment' }
  | { type: 'record_purchase' }
  | { type: 'record_reception' }
  | { type: 'cancel' }
  | null;

export default function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  const { message } = App.useApp();

  // Forms for complex modals
  const [notesForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [purchaseForm] = Form.useForm();
  const [receptionForm] = Form.useForm();
  const [cancelForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      const [prRes, actionsRes] = await Promise.all([
        fetch(`/api/v1/procurement/purchase-requests/${id}`),
        fetch(`/api/v1/procurement/purchase-requests/${id}/transitions`),
      ]);
      if (prRes.ok) {
        const json = await prRes.json();
        setPr(json.data ?? json ?? null);
      } else {
        setPr(null);
      }
      if (actionsRes.ok) {
        const json = await actionsRes.json();
        setAvailableActions(Array.isArray(json) ? json : json.data ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const executeTransition = async (action: string, notes?: string, data?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-requests/${id}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined, data, version: pr?.version }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Action failed');
        return;
      }

      message.success(ACTION_SUCCESS_MESSAGES[action] ?? 'Action completed');
      setActiveModal(null);
      notesForm.resetFields();
      paymentForm.resetFields();
      purchaseForm.resetFields();
      receptionForm.resetFields();
      cancelForm.resetFields();
      fetchData();
    } catch {
      message.error('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const onAction = (action: string) => {
    switch (action) {
      case 'schedule_payment':
        setActiveModal({ type: 'schedule_payment' });
        break;
      case 'record_purchase':
        purchaseForm.setFieldsValue({
          totalAmount: pr?.estimatedTotal ? Number(pr.estimatedTotal) : undefined,
        });
        setActiveModal({ type: 'record_purchase' });
        break;
      case 'record_reception':
        receptionForm.setFieldsValue({
          conforming: true,
          items: pr?.items?.map((item: any) => ({
            purchaseRequestItemId: item.id,
            description: item.description,
            quantityOrdered: Number(item.quantity),
            quantityReceived: Number(item.quantity),
            conforming: true,
          })),
        });
        setActiveModal({ type: 'record_reception' });
        break;
      case 'cancel':
        setActiveModal({ type: 'cancel' });
        break;
      case 'validate':
      case 'approve':
      case 'reject':
      case 'return_to_requester':
      case 'escalate_issue':
      case 'return_to_vendor': {
        const label = availableActions.find(a => a.action === action)?.label ?? action;
        setActiveModal({ type: 'notes', action, label });
        break;
      }
      default:
        executeTransition(action);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!pr) return <div><Title level={4}>Purchase Request not found</Title></div>;

  const isTerminal = TERMINAL_STATES.includes(pr.status);

  const timelineEntries = [
    { state: 'draft', label: 'Created', timestamp: pr.createdAt },
    ...(pr.submittedAt ? [{ state: 'submitted', label: 'Submitted for Review', timestamp: pr.submittedAt }] : []),
    ...(pr.validatedAt ? [{ state: 'validated', label: 'Validated', timestamp: pr.validatedAt }] : []),
    ...(pr.approvedAt ? [{ state: 'approved', label: 'Approved', timestamp: pr.approvedAt }] : []),
    ...(pr.processedAt ? [{ state: 'in_procurement', label: 'Procurement Started', timestamp: pr.processedAt }] : []),
    ...(pr.scheduledPaymentDate ? [{ state: 'payment_scheduled', label: `Payment Scheduled for ${new Date(pr.scheduledPaymentDate).toLocaleDateString()}`, timestamp: pr.scheduledPaymentDate }] : []),
    ...(pr.status === 'purchased' || pr.status === 'received' || pr.status === 'received_with_issues' || pr.status === 'closed'
      ? [{ state: 'purchased', label: 'Purchased' }] : []),
    ...(pr.status === 'received' || pr.status === 'closed'
      ? [{ state: 'received', label: 'Goods Received' }] : []),
    ...(pr.status === 'received_with_issues' || pr.status === 'pending_resolution'
      ? [{ state: 'received_with_issues', label: 'Received with Issues' }] : []),
    ...(pr.status === 'pending_resolution'
      ? [{ state: 'pending_resolution', label: 'Pending Resolution' }] : []),
    ...(pr.rejectedAt ? [{ state: 'rejected', label: 'Rejected', timestamp: pr.rejectedAt }] : []),
    ...(pr.status === 'cancelled' ? [{ state: 'cancelled', label: 'Cancelled' }] : []),
    ...(pr.status === 'closed' ? [{ state: 'closed', label: 'Closed' }] : []),
    ...(pr.status === 'returned_by_validator' ? [{ state: 'returned_by_validator', label: 'Returned by Validator' }] : []),
    ...(pr.status === 'returned_by_approver' ? [{ state: 'returned_by_approver', label: 'Returned by Approver' }] : []),
  ];

  const itemColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', render: (v: string) => Number(v) },
    { title: 'Unit', dataIndex: 'unit', key: 'unit' },
    { title: 'Est. Price', dataIndex: 'estimatedPrice', key: 'estimatedPrice', render: (v: string | null) => v ? `$${Number(v).toLocaleString()}` : '-' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Space align="center" style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space align="center">
          <Title level={4} style={{ margin: 0 }}>{pr.number}</Title>
          <StatusBadge status={pr.status} labels={PURCHASE_REQUEST_STATUS_LABELS} colors={PURCHASE_REQUEST_STATUS_COLORS} />
        </Space>
        <Button
          icon={<CopyOutlined />}
          onClick={() => router.push(`/procurement/requests/new?templateId=${id}`)}
        >
          Use as Template
        </Button>
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
          {pr.scheduledPaymentDate && (
            <Descriptions.Item label="Payment Date">{new Date(pr.scheduledPaymentDate).toLocaleDateString()}</Descriptions.Item>
          )}
          {pr.orders?.length > 0 && (
            <Descriptions.Item label="Purchase Orders" span={2}>
              {pr.orders.map((po: any) => (
                <div key={po.id}>
                  {po.invoiceNumber && <Text strong>Invoice: {po.invoiceNumber}</Text>}
                  {' — '}${Number(po.totalAmount).toLocaleString()} via {po.paymentMethod}
                  {po.bankReference && ` (Ref: ${po.bankReference})`}
                  {' — '}{new Date(po.purchaseDate).toLocaleDateString()}
                </div>
              ))}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Items" style={{ marginTop: 16 }}>
        <Table columns={itemColumns} dataSource={pr.items ?? []} rowKey="id" pagination={false} size="small" />
      </Card>

      {pr.receptions?.length > 0 && (
        <Card title="Receptions" style={{ marginTop: 16 }}>
          {pr.receptions.map((rec: any) => (
            <div key={rec.id} style={{ marginBottom: 12 }}>
              <Text strong>{rec.conforming ? 'Conforming' : 'Non-conforming'}</Text>
              {rec.issueType && <Text type="danger"> — {rec.issueType}</Text>}
              <Text type="secondary"> — {new Date(rec.receivedAt).toLocaleDateString()}</Text>
              {rec.notes && <div><Text type="secondary">{rec.notes}</Text></div>}
            </div>
          ))}
        </Card>
      )}

      {isTerminal ? (
        <Card style={{ marginTop: 16 }}>
          <Result
            status={pr.status === 'closed' ? 'success' : pr.status === 'rejected' ? 'error' : 'info'}
            title={PURCHASE_REQUEST_STATUS_LABELS[pr.status as keyof typeof PURCHASE_REQUEST_STATUS_LABELS] ?? pr.status}
            subTitle={
              pr.rejectionReason
                ? `Reason: ${pr.rejectionReason}`
                : pr.cancellationReason
                ? `Reason: ${pr.cancellationReason}`
                : pr.status === 'closed'
                ? 'This request has been completed and closed.'
                : 'This request has been cancelled.'
            }
          />
        </Card>
      ) : (
        <Card title="Workflow" style={{ marginTop: 16 }}>
          <WorkflowTimeline
            entries={timelineEntries}
            currentState={pr.status}
            availableActions={availableActions}
            loading={actionLoading}
            onAction={onAction}
          />
        </Card>
      )}

      {/* Notes modal (validate, approve, reject, return) */}
      <Modal
        title={activeModal?.type === 'notes' ? activeModal.label : ''}
        open={activeModal?.type === 'notes'}
        forceRender
        onOk={() => {
          if (activeModal?.type === 'notes') {
            const values = notesForm.getFieldsValue();
            executeTransition(activeModal.action, values.notes);
          }
        }}
        onCancel={() => { setActiveModal(null); notesForm.resetFields(); }}
        confirmLoading={actionLoading}
      >
        <Form form={notesForm} layout="vertical">
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Add notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Schedule Payment modal */}
      <Modal
        title="Schedule Payment"
        forceRender
        open={activeModal?.type === 'schedule_payment'}
        onOk={async () => {
          try {
            const values = await paymentForm.validateFields();
            executeTransition('schedule_payment', values.notes, {
              scheduledPaymentDate: values.scheduledPaymentDate.toISOString(),
            });
          } catch {}
        }}
        onCancel={() => { setActiveModal(null); paymentForm.resetFields(); }}
        confirmLoading={actionLoading}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="scheduledPaymentDate" label="Payment Date" rules={[{ required: true, message: 'Payment date is required' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Purchase modal */}
      <Modal
        title="Record Purchase"
        forceRender
        open={activeModal?.type === 'record_purchase'}
        width={600}
        onOk={async () => {
          try {
            const values = await purchaseForm.validateFields();
            executeTransition('record_purchase', values.notes, {
              purchaseDate: values.purchaseDate.toISOString(),
              totalAmount: values.totalAmount,
              paymentMethod: values.paymentMethod,
              invoiceNumber: values.invoiceNumber || undefined,
              bankReference: values.bankReference || undefined,
              vendorDetails: values.vendorDetails || undefined,
            });
          } catch {}
        }}
        onCancel={() => { setActiveModal(null); purchaseForm.resetFields(); }}
        confirmLoading={actionLoading}
      >
        <Form form={purchaseForm} layout="vertical">
          <Form.Item name="purchaseDate" label="Purchase Date" rules={[{ required: true, message: 'Purchase date is required' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="totalAmount" label="Total Amount" rules={[{ required: true, message: 'Total amount is required' }]}>
            <InputNumber prefix="$" style={{ width: '100%' }} min={0.01} precision={2} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true, message: 'Payment method is required' }]}>
            <Select options={PAYMENT_METHODS} placeholder="Select payment method" />
          </Form.Item>
          <Form.Item name="invoiceNumber" label="Invoice Number">
            <Input placeholder="Invoice # (optional)" />
          </Form.Item>
          <Form.Item name="bankReference" label="Bank Reference">
            <Input placeholder="Bank reference (optional)" />
          </Form.Item>
          <Form.Item name="vendorDetails" label="Vendor Details">
            <Input.TextArea rows={2} placeholder="Additional vendor details (optional)" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Reception modal */}
      <Modal
        title="Record Reception"
        forceRender
        open={activeModal?.type === 'record_reception'}
        width={700}
        onOk={async () => {
          try {
            const values = await receptionForm.validateFields();
            const items = values.items?.map((item: any) => ({
              purchaseRequestItemId: item.purchaseRequestItemId,
              quantityReceived: item.quantityReceived,
              conforming: item.conforming ?? true,
              notes: item.itemNotes || undefined,
            }));
            executeTransition('record_reception', values.notes, {
              conforming: values.conforming,
              issueType: values.conforming ? undefined : values.issueType,
              items,
            });
          } catch {}
        }}
        onCancel={() => { setActiveModal(null); receptionForm.resetFields(); }}
        confirmLoading={actionLoading}
      >
        <Form form={receptionForm} layout="vertical">
          <Form.Item name="conforming" label="All items received in good condition?" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.conforming !== cur.conforming}>
            {({ getFieldValue }) =>
              !getFieldValue('conforming') && (
                <Form.Item name="issueType" label="Issue Type" rules={[{ required: true, message: 'Select an issue type' }]}>
                  <Select options={ISSUE_TYPES} placeholder="Select issue type" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Divider>Items Received</Divider>
          <Form.List name="items">
            {(fields) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                    <Form.Item {...restField} name={[name, 'purchaseRequestItemId']} hidden>
                      <Input />
                    </Form.Item>
                    <Text style={{ flex: 1 }}>
                      {receptionForm.getFieldValue(['items', name, 'description'])}
                    </Text>
                    <Text type="secondary" style={{ width: 80 }}>
                      Ordered: {receptionForm.getFieldValue(['items', name, 'quantityOrdered'])}
                    </Text>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantityReceived']}
                      rules={[{ required: true, message: 'Required' }]}
                      style={{ margin: 0, width: 120 }}
                    >
                      <InputNumber placeholder="Received" min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'conforming']} valuePropName="checked" style={{ margin: 0 }}>
                      <Switch size="small" checkedChildren="OK" unCheckedChildren="Issue" />
                    </Form.Item>
                  </div>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Reception Notes">
            <Input.TextArea rows={2} placeholder="Notes about the reception (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cancel modal */}
      <Modal
        title="Cancel Request"
        forceRender
        open={activeModal?.type === 'cancel'}
        onOk={async () => {
          try {
            const values = await cancelForm.validateFields();
            executeTransition('cancel', values.reason);
          } catch {}
        }}
        onCancel={() => { setActiveModal(null); cancelForm.resetFields(); }}
        confirmLoading={actionLoading}
        okButtonProps={{ danger: true }}
        okText="Confirm Cancellation"
      >
        <Form form={cancelForm} layout="vertical">
          <Text type="secondary">This action cannot be undone. The request will be permanently cancelled.</Text>
          <Form.Item name="reason" label="Cancellation Reason" rules={[{ required: true, message: 'Please provide a reason for cancellation' }]} style={{ marginTop: 16 }}>
            <Input.TextArea rows={3} placeholder="Why is this request being cancelled?" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
