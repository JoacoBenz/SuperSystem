'use client';

import { Card, Descriptions, Typography, Table, App, Modal, Input, Space, Spin, Button, Result } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkflowTimeline } from '@/components/ui/WorkflowTimeline';
import { PURCHASE_REQUEST_STATUS_LABELS, PURCHASE_REQUEST_STATUS_COLORS } from '@/src/modules/procurement/types';

const { Title } = Typography;

interface AvailableAction {
  action: string;
  label: string;
  permitted: boolean;
}

// Actions that should prompt for notes before executing
const ACTIONS_REQUIRING_NOTES = [
  'reject', 'return_to_requester', 'validate', 'approve',
];

// Human-readable success messages per action
const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  submit: 'Request submitted for review',
  validate: 'Request validated successfully',
  return_to_requester: 'Request returned to requester',
  approve: 'Request approved',
  reject: 'Request rejected',
  start_procurement: 'Procurement process started',
  schedule_payment: 'Payment scheduled',
  record_purchase: 'Purchase recorded',
  record_reception: 'Reception recorded',
  close: 'Request closed',
  cancel: 'Request cancelled',
};

// Terminal and completed states where we show a result banner
const TERMINAL_STATES = ['rejected', 'cancelled', 'closed'];

export default function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesModal, setNotesModal] = useState<{ action: string; label: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([]);
  const { message } = App.useApp();

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

      const successMsg = ACTION_SUCCESS_MESSAGES[action] ?? 'Action completed';
      message.success(successMsg);
      setNotesModal(null);
      setNotes('');
      fetchData();
    } catch {
      message.error('An unexpected error occurred');
    } finally {
      setActionLoading(false);
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
    ...(pr.scheduledPaymentDate ? [{ state: 'payment_scheduled', label: 'Payment Scheduled', timestamp: pr.scheduledPaymentDate }] : []),
    ...(pr.status === 'purchased' || pr.status === 'received' || pr.status === 'received_with_issues' || pr.status === 'closed'
      ? [{ state: 'purchased', label: 'Purchased' }] : []),
    ...(pr.status === 'received' || pr.status === 'closed'
      ? [{ state: 'received', label: 'Received' }] : []),
    ...(pr.status === 'received_with_issues'
      ? [{ state: 'received_with_issues', label: 'Received with Issues' }] : []),
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
        </Descriptions>
      </Card>

      <Card title="Items" style={{ marginTop: 16 }}>
        <Table columns={itemColumns} dataSource={pr.items ?? []} rowKey="id" pagination={false} size="small" />
      </Card>

      {isTerminal ? (
        <Card style={{ marginTop: 16 }}>
          <Result
            status={pr.status === 'closed' ? 'success' : pr.status === 'rejected' ? 'error' : 'info'}
            title={PURCHASE_REQUEST_STATUS_LABELS[pr.status as keyof typeof PURCHASE_REQUEST_STATUS_LABELS] ?? pr.status}
            subTitle={
              pr.rejectionReason
                ? `Reason: ${pr.rejectionReason}`
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
            onAction={(action) => {
              if (ACTIONS_REQUIRING_NOTES.includes(action)) {
                const label = availableActions.find(a => a.action === action)?.label ?? action;
                setNotesModal({ action, label });
              } else {
                handleAction(action);
              }
            }}
          />
        </Card>
      )}

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
    </div>
  );
}
