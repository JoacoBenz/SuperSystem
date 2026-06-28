'use client';
import { App, Table, Tag, Spin, Segmented } from 'antd';
import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface AgingRow {
  id: number;
  invoiceNumber: string;
  partner: string;
  outstanding: number;
  daysOverdue: number;
  bucket: string;
}
interface Aging {
  buckets: Record<string, number>;
  totalOutstanding: number;
  rows: AgingRow[];
}
interface AgingResponse { asOf: string; receivables: Aging; payables: Aging; }

const BUCKET_LABEL: Record<string, string> = { current: 'Current', d1_30: '1–30 Days', d31_60: '31–60 Days', d61_90: '61–90 Days', d90plus: '90+ Days' };
const BUCKET_COLOR: Record<string, string> = { current: 'success', d1_30: 'processing', d31_60: 'warning', d61_90: 'orange', d90plus: 'error' };
const ORDER = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus'];

const money = (v: number) => `$ ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

function BucketStrip({ aging }: { aging: Aging }) {
  return (
    <div style={{ display: 'flex', gap: 1, marginBottom: 16, border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, overflow: 'hidden' }}>
      {ORDER.map(k => (
        <div key={k} style={{ flex: 1, padding: '14px 16px', background: 'var(--surface, #fafafa)', borderRight: '1px solid var(--border, #eee)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.6 }}>{BUCKET_LABEL[k]}</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{money(aging.buckets[k] ?? 0)}</div>
        </div>
      ))}
      <div style={{ flex: 1, padding: '14px 16px', background: 'var(--surface-strong, #f0f0f3)' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.6 }}>Total Outstanding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{money(aging.totalOutstanding)}</div>
      </div>
    </div>
  );
}

export default function AgingPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<AgingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'Receivables' | 'Payables'>('Receivables');

  useEffect(() => {
    fetch('/api/v1/finance/aging')
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => message.error('Failed to load aging report'))
      .finally(() => setLoading(false));
  }, [message]);

  const columns: ColumnsType<AgingRow> = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', width: 130 },
    { title: view === 'Receivables' ? 'Customer' : 'Vendor', dataIndex: 'partner' },
    { title: 'Bucket', dataIndex: 'bucket', width: 130, render: (b: string) => <Tag color={BUCKET_COLOR[b]}>{BUCKET_LABEL[b]}</Tag> },
    { title: 'Days Overdue', dataIndex: 'daysOverdue', align: 'right', width: 130, render: (d: number) => (d > 0 ? d : '—') },
    { title: 'Outstanding', dataIndex: 'outstanding', align: 'right', width: 150, render: (v: number) => money(v) },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>;

  const aging = data ? (view === 'Receivables' ? data.receivables : data.payables) : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>AR / AP Aging</h2>
        <Segmented options={['Receivables', 'Payables']} value={view} onChange={v => setView(v as 'Receivables' | 'Payables')} />
      </div>
      {data && <div style={{ opacity: 0.55, fontSize: 13, marginBottom: 12 }}>As of {new Date(data.asOf).toLocaleString()}</div>}
      {aging && <BucketStrip aging={aging} />}
      <Table columns={columns} dataSource={aging?.rows ?? []} rowKey="id" size="small" pagination={false} />
    </div>
  );
}
