'use client';

import { App, Table, Card, Tag, Input } from 'antd';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface StockEntry {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number | null;
  conforming: boolean;
  notes: string | null;
  receivedAt: string;
  receptionId: number;
}

export default function InventoryEntriesPage() {
  const { message } = App.useApp();
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchEntries = useCallback(async (p = 1, desc = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (desc) params.set('description', desc);
      const res = await fetch('/api/v1/inventory/entries?' + params);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data ?? []);
        setTotal(data.total ?? 0);
      } else { message.error('Failed to load entries'); }
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message]);

  useEffect(() => { fetchEntries(page, search); }, [fetchEntries, page]);

  const columns: ColumnsType<StockEntry> = [
    { title: 'Reception #', dataIndex: 'receptionId', width: 110 },
    { title: 'Item', dataIndex: 'description' },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 90,
      align: 'right' as const,
      render: (q: number, r) => `${q.toFixed(2)} ${r.unit}`,
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      width: 110,
      align: 'right' as const,
      render: (c: number | null) => c ? `$${c.toFixed(2)}` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'conforming',
      width: 110,
      render: (c: boolean) => (
        <Tag color={c ? 'green' : 'red'}>{c ? 'Conforming' : 'Non-Conforming'}</Tag>
      ),
    },
    { title: 'Notes', dataIndex: 'notes', render: (n: string | null) => n ?? '-' },
    {
      title: 'Received At',
      dataIndex: 'receivedAt',
      width: 180,
      render: (d: string) => new Date(d).toLocaleString(),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Reception History</h2>
      </div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by item description..."
            style={{ width: 320 }}
            allowClear
            onSearch={v => { setSearch(v); fetchEntries(1, v); }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={entries}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: p => setPage(p),
            showTotal: (t) => `${t} entries`,
          }}
          size="small"
        />
      </Card>
    </div>
  );
}
