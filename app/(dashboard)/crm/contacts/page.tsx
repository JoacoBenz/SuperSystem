'use client';

import {
  App,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

export default function CrmContactsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | undefined>(undefined);
  const [companies, setCompanies] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/crm/companies?limit=200');
      const json = await res.json();
      setCompanies(json.data ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set('search', search);
    if (companyFilter) params.set('companyId', String(companyFilter));
    try {
      const res = await fetch(`/api/v1/crm/contacts?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, companyFilter]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          companyId: values.companyId ? Number(values.companyId) : undefined,
          title: values.title || null,
          email: values.email || null,
          phone: values.phone || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create contact');
        return;
      }
      message.success('Contact created');
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
      title: 'Name',
      key: 'name',
      render: (_: any, record: any) => `${record.firstName} ${record.lastName}`,
    },
    {
      title: 'Company',
      key: 'company',
      render: (_: any, record: any) => record.company?.name ?? '-',
    },
    { title: 'Title', dataIndex: 'title', key: 'title', render: (v: string | null) => v ?? '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v: string | null) => v ?? '-', ellipsis: true },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v: string | null) => v ?? '-' },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 90,
      render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Contacts
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            New Contact
          </Button>
        </Col>
      </Row>

      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="Search contacts..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            style={{ width: '100%' }}
            placeholder="Filter by company"
            allowClear
            value={companyFilter}
            onChange={(v) => { setCompanyFilter(v); setPage(1); }}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
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
      />

      <Modal
        title="New Contact"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Jane" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Smith" />
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
          <Form.Item name="title" label="Title">
            <Input placeholder="Sales Director" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="jane.smith@example.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="+1 555 000 0000" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
