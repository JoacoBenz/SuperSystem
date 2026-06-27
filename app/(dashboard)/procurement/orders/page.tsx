'use client';

import { Table, Typography, Row, Col, App } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const { Title, Text } = Typography;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card',
  check: 'Check',
  other: 'Other',
};

export default function PurchaseOrdersPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      const res = await fetch(`/api/v1/procurement/purchase-orders?${params}`);
      if (!res.ok) { message.error('Failed to load purchase orders'); return; }
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch { message.error('An error occurred'); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      title: 'PR',
      key: 'pr',
      render: (_: any, row: any) => (
        <Link href={`/procurement/requests/${row.purchaseRequestId}`}>
          <Text strong>{row.purchaseRequest?.number}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.purchaseRequest?.title}</Text>
        </Link>
      ),
    },
    { title: 'Vendor', dataIndex: 'vendorName', key: 'vendorName' },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (v: any) => `$${Number(v).toLocaleString()}`,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (v: string) => PAYMENT_METHOD_LABELS[v] ?? v,
    },
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v: string | null) => v ?? '-' },
    {
      title: 'Purchase Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Purchase Orders</Title></Col>
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
          showTotal: t => `${t} total`,
          showSizeChanger: true,
        }}
      />
    </div>
  );
}
