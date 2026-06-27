'use client';

import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Table,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { variance, isOverBudget } from '@/src/modules/budget/variance';

const { Title } = Typography;

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

export default function BudgetItemsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [budgetFilter, setBudgetFilter] = useState<number | undefined>(undefined);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch('/api/v1/budget?limit=100')
      .then((r) => r.json())
      .then((json) => setBudgets(json.data ?? []))
      .finally(() => setBudgetsLoading(false));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (budgetFilter) params.set('budgetId', String(budgetFilter));
    try {
      const res = await fetch(`/api/v1/budget/items?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, budgetFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/budget/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId: values.budgetId,
          category: values.category,
          description: values.description || null,
          plannedAmount: values.plannedAmount ?? 0,
          actualAmount: values.actualAmount ?? 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create line item');
        return;
      }
      message.success('Line item added');
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
    {
      title: 'Budget',
      dataIndex: 'budgetName',
      key: 'budgetName',
      ellipsis: true,
      render: (v: string | null) => v ?? '-',
    },
    { title: 'Category', dataIndex: 'category', key: 'category', ellipsis: true },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Planned',
      dataIndex: 'plannedAmount',
      key: 'plannedAmount',
      width: 130,
      render: (v: number) => fmt(v),
    },
    {
      title: 'Actual',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      width: 130,
      render: (v: number) => fmt(v),
    },
    {
      title: 'Variance',
      key: 'variance',
      width: 130,
      render: (_: any, record: any) => {
        const v = variance(record.plannedAmount, record.actualAmount);
        return (
          <span style={{ color: isOverBudget(record.plannedAmount, record.actualAmount) ? '#ff4d4f' : undefined }}>{fmt(v)}</span>
        );
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Line Items
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Add Item
          </Button>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="Filter by budget"
            allowClear
            loading={budgetsLoading}
            style={{ width: '100%' }}
            value={budgetFilter}
            onChange={(v) => {
              setBudgetFilter(v);
              setPage(1);
            }}
            options={budgets.map((b) => ({ value: b.id, label: `${b.name} (FY${b.fiscalYear})` }))}
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
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          showTotal: (t) => `${t} total`,
          showSizeChanger: true,
        }}
      />

      <Modal
        title="Add Line Item"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="budgetId"
            label="Budget"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select
              placeholder="Select a budget"
              loading={budgetsLoading}
              options={budgets.map((b) => ({ value: b.id, label: `${b.name} (FY${b.fiscalYear})` }))}
            />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Travel, Software, Salaries..." />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional details" />
          </Form.Item>
          <Form.Item name="plannedAmount" label="Planned Amount">
            <InputNumber
              placeholder="0.00"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="$"
            />
          </Form.Item>
          <Form.Item name="actualAmount" label="Actual Amount">
            <InputNumber
              placeholder="0.00"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="$"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
