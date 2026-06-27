'use client';

import {
  App,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { SoonWithAI } from '@/components/ui/SoonWithAI';

const { Title } = Typography;

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

const STAGE_COLOR: Record<string, string> = {
  lead: 'default',
  qualified: 'processing',
  proposal: 'warning',
  negotiation: 'orange',
  won: 'success',
  lost: 'error',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  lead: ['qualified', 'lost'],
  qualified: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
};

export default function CrmOpportunitiesPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transitioningId, setTransitioningId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchRelated = useCallback(async () => {
    try {
      const [cRes, ctRes] = await Promise.all([
        fetch('/api/v1/crm/companies?limit=200'),
        fetch('/api/v1/crm/contacts?limit=200'),
      ]);
      const [cJson, ctJson] = await Promise.all([cRes.json(), ctRes.json()]);
      setCompanies(cJson.data ?? []);
      setContacts(ctJson.data ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (stageFilter) params.set('stage', stageFilter);
    try {
      const res = await fetch(`/api/v1/crm/opportunities?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, stageFilter]);

  useEffect(() => { fetchRelated(); }, [fetchRelated]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTransition = async (id: number, newStage: string) => {
    setTransitioningId(id);
    try {
      const res = await fetch(`/api/v1/crm/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to update stage');
        return;
      }
      message.success(`Stage updated to ${newStage}`);
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setTransitioningId(null);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: values.title,
        stage: values.stage ?? 'lead',
        currency: values.currency ?? 'USD',
        probability: values.probability ?? 10,
      };
      if (values.companyId) payload.companyId = Number(values.companyId);
      if (values.contactId) payload.contactId = Number(values.contactId);
      if (values.value) payload.value = Number(values.value);
      if (values.expectedCloseDate) payload.expectedCloseDate = values.expectedCloseDate.toISOString();
      if (values.notes) payload.notes = values.notes;

      const res = await fetch('/api/v1/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create opportunity');
        return;
      }
      message.success('Opportunity created');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Company',
      key: 'company',
      render: (_: any, record: any) => record.company?.name ?? '-',
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: any, record: any) =>
        record.contact
          ? `${record.contact.firstName} ${record.contact.lastName}`
          : '-',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (s: string) => (
        <Tag color={STAGE_COLOR[s] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {s}
        </Tag>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (v: number | null) =>
        v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      render: (p: number) => `${p}%`,
      width: 110,
    },
    {
      title: 'Expected Close',
      dataIndex: 'expectedCloseDate',
      key: 'expectedCloseDate',
      render: (d: string | null) => (d ? new Date(d).toLocaleDateString() : '-'),
      width: 130,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : '-'),
      width: 110,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => {
        const next = VALID_TRANSITIONS[record.stage] ?? [];
        if (next.length === 0) return <Tag>{record.stage}</Tag>;
        return (
          <Space size={4} wrap>
            {next.map((s) => (
              <Button
                key={s}
                size="small"
                type={s === 'lost' ? 'default' : 'primary'}
                danger={s === 'lost'}
                loading={transitioningId === record.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTransition(record.id, s);
                }}
                style={{ textTransform: 'capitalize' }}
              >
                → {s}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              Opportunities
            </Title>
            <SoonWithAI
              feature="Lead Scoring"
              description="Ranks every open opportunity by likelihood to close using past win/loss patterns, deal size, and stage velocity — so reps spend their time on the deals that will actually land."
            />
          </span>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            New Opportunity
          </Button>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Select
            style={{ width: '100%' }}
            placeholder="Filter by stage"
            allowClear
            value={stageFilter}
            onChange={(v) => { setStageFilter(v); setPage(1); }}
            options={STAGES.map((s) => ({
              value: s,
              label: (
                <Tag color={STAGE_COLOR[s]} style={{ textTransform: 'capitalize' }}>
                  {s}
                </Tag>
              ),
            }))}
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `${t} total`,
          showSizeChanger: true,
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="New Opportunity"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Enterprise License Deal" />
          </Form.Item>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="stage" label="Stage" initialValue="lead">
                <Select options={STAGES.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="probability" label="Probability (%)" initialValue={10}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="companyId" label="Company">
            <Select
              allowClear
              placeholder="Select company"
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="contactId" label="Contact">
            <Select
              allowClear
              placeholder="Select contact"
              options={contacts.map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName}`,
              }))}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Row gutter={8}>
            <Col span={14}>
              <Form.Item name="value" label="Value">
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  prefix="$"
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="currency" label="Currency" initialValue="USD">
                <Select>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="EUR">EUR</Select.Option>
                  <Select.Option value="GBP">GBP</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="expectedCloseDate" label="Expected Close Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
