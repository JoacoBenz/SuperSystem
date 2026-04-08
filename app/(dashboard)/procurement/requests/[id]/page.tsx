'use client';

import { Card, Descriptions, Typography, Divider, Table, App, Modal, Input, Space, Spin, Tooltip, Button } from 'antd';
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

      <Card title="Workflow" style={{ marginTop: 16 }}>
        <WorkflowTimeline
          entries={timelineEntries}
          currentState={pr.status}
          availableActions={availableActions}
          loading={actionLoading}
          onAction={(action) => {
            if (actionsNeedingNotes.includes(action)) {
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
    </div>
  );
}
