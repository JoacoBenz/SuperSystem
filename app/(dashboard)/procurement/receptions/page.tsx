'use client';

import { Table, Button, Typography, Row, Col, Tag, Space, Select } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

export default function ReceptionsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

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
      title: 'Date', dataIndex: 'receivedAt', key: 'receivedAt', width: 120,
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
    </div>
  );
}
