'use client';

import {
  App,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;

export default function CrmCompaniesPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/v1/crm/companies?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/crm/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          industry: values.industry || null,
          website: values.website || null,
          phone: values.phone || null,
          address: values.address || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err?.error?.message ?? 'Failed to create company');
        return;
      }
      message.success('Company created');
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
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Industry', dataIndex: 'industry', key: 'industry', render: (v: string | null) => v ?? '-' },
    {
      title: 'Website',
      dataIndex: 'website',
      key: 'website',
      render: (v: string | null) =>
        v ? (
          <a href={v} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            {v}
          </a>
        ) : '-',
    },
    { title: 'Contacts', dataIndex: 'contactCount', key: 'contactCount', width: 100 },
    { title: 'Opportunities', dataIndex: 'opportunityCount', key: 'opportunityCount', width: 130 },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 90,
      render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            message.info(`Company: ${record.name} | Industry: ${record.industry ?? 'N/A'} | Phone: ${record.phone ?? 'N/A'}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Companies
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            New Company
          </Button>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="Search companies..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
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
        onRow={(record) => ({
          onClick: () =>
            message.info(
              `Company: ${record.name} | Contacts: ${record.contactCount} | Opportunities: ${record.opportunityCount}`,
            ),
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="New Company"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Acme Corporation" />
          </Form.Item>
          <Form.Item name="industry" label="Industry">
            <Input placeholder="Technology, Finance, Healthcare..." />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="+1 555 000 0000" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="123 Main St, City, Country" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
