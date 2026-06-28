'use client';

import { Typography, Segmented, Spin, Tag } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

const fmt = (n: number) => {
  const v = Math.round(Number(n) || 0);
  const s = `$${Math.abs(v).toLocaleString('en-US')}`;
  return v < 0 ? `(${s})` : s;
};

type Line = { code: string; name: string; amount: number };

function Row({ label, amount, opts }: { label: string; amount: number; opts?: { bold?: boolean; total?: boolean; muted?: boolean; em?: boolean } }) {
  const { bold, total, muted, em } = opts ?? {};
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: total ? '10px 0' : '6px 0',
        borderTop: total ? '2px solid #16181d' : undefined,
        marginTop: total ? 4 : undefined,
        fontWeight: bold || total ? 700 : 400,
        fontSize: em ? 16 : 14,
        color: muted ? '#8b91a0' : '#16181d',
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: "'Space Grotesk', monospace", color: amount < 0 ? '#cf1322' : undefined }}>{fmt(amount)}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, fontWeight: 600, color: '#8b91a0', margin: '20px 0 6px' }}>
      {children}
    </div>
  );
}

export default function FinancialStatementsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'Income Statement' | 'Balance Sheet' | 'Cash Flow'>('Income Statement');

  useEffect(() => {
    fetch('/api/v1/accounting/statements')
      .then(r => r.json())
      .then(j => setData(j.data ?? j))
      .finally(() => setLoading(false));
  }, []);

  const wrap = { maxWidth: 640 };

  const income = () => {
    const s = data.incomeStatement;
    return (
      <div style={wrap}>
        <SectionLabel>Revenue</SectionLabel>
        {s.revenue.length ? s.revenue.map((l: Line) => <Row key={l.code} label={`${l.code} · ${l.name}`} amount={l.amount} />) : <Text type="secondary">No revenue accounts</Text>}
        <Row label="Total Revenue" amount={s.totalRevenue} opts={{ bold: true }} />

        <SectionLabel>Cost of Goods Sold</SectionLabel>
        {s.cogs.length ? s.cogs.map((l: Line) => <Row key={l.code} label={`${l.code} · ${l.name}`} amount={l.amount} />) : <Text type="secondary">—</Text>}
        <Row label="Gross Profit" amount={s.grossProfit} opts={{ total: true }} />

        <SectionLabel>Operating Expenses</SectionLabel>
        {s.operatingExpenses.length ? s.operatingExpenses.map((l: Line) => <Row key={l.code} label={`${l.code} · ${l.name}`} amount={l.amount} />) : <Text type="secondary">—</Text>}
        <Row label="Total Operating Expenses" amount={s.totalOperatingExpenses} opts={{ bold: true }} />

        <Row label="Net Income" amount={s.netIncome} opts={{ total: true, em: true }} />
      </div>
    );
  };

  const balance = () => {
    const s = data.balanceSheet;
    return (
      <div style={wrap}>
        <SectionLabel>Assets</SectionLabel>
        {s.assets.map((l: Line) => <Row key={l.code} label={`${l.code} · ${l.name}`} amount={l.amount} />)}
        <Row label="Total Assets" amount={s.totalAssets} opts={{ total: true }} />

        <SectionLabel>Liabilities</SectionLabel>
        {s.liabilities.length ? s.liabilities.map((l: Line) => <Row key={l.code} label={`${l.code} · ${l.name}`} amount={l.amount} />) : <Text type="secondary">—</Text>}
        <Row label="Total Liabilities" amount={s.totalLiabilities} opts={{ bold: true }} />

        <SectionLabel>Equity</SectionLabel>
        {s.equity.map((l: Line) => <Row key={l.code} label={`${l.code} · ${l.name}`} amount={l.amount} />)}
        <Row label="Current Period Earnings" amount={s.currentEarnings} />
        <Row label="Total Equity" amount={s.totalEquity} opts={{ bold: true }} />

        <Row label="Total Liabilities & Equity" amount={s.totalLiabilitiesAndEquity} opts={{ total: true }} />

        <div style={{ marginTop: 16 }}>
          {s.balanced
            ? <Tag color="success">Balanced — Assets = Liabilities + Equity</Tag>
            : <Tag color="warning">Out of balance by {fmt(s.difference)} (opening balances predate double-entry posting)</Tag>}
        </div>
      </div>
    );
  };

  const cash = () => {
    const s = data.cashFlow;
    return (
      <div style={wrap}>
        <SectionLabel>Cash Flow (cash basis, from Treasury)</SectionLabel>
        <Row label="Beginning Cash" amount={s.beginningCash} opts={{ muted: true }} />
        <Row label="Cash Inflows" amount={s.cashInflows} />
        <Row label="Cash Outflows" amount={-Math.abs(s.cashOutflows)} />
        <Row label="Net Change in Cash" amount={s.netCashFlow} opts={{ bold: true }} />
        <Row label="Ending Cash" amount={s.endingCash} opts={{ total: true, em: true }} />
      </div>
    );
  };

  return (
    <div>
      <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>Financial Statements</Title>

      <Segmented
        options={['Income Statement', 'Balance Sheet', 'Cash Flow']}
        value={view}
        onChange={(v) => setView(v as typeof view)}
        style={{ marginBottom: 20 }}
      />

      {loading || !data ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
      ) : view === 'Income Statement' ? income() : view === 'Balance Sheet' ? balance() : cash()}
    </div>
  );
}
