'use client';
import { App, Table, Button, Modal, Form, Input, Select, Tag, Space, Drawer, Divider, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';

const ROLE_COLOR: Record<string, string> = { customer: 'blue', vendor: 'gold', both: 'green' };
const money = (v: number) => '$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

interface Partner { id: number; name: string; roles: string; taxId: string | null; email: string | null; active: boolean; contactCount?: number; }
interface Opt { id: number; name: string; }

export default function PartnersPage() {
  const { message } = App.useApp();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [vendors, setVendors] = useState<Opt[]>([]);
  const [companies, setCompanies] = useState<Opt[]>([]);
  const [linkKind, setLinkKind] = useState<'customer' | 'vendor' | 'company'>('customer');
  const [linkRecord, setLinkRecord] = useState<number | undefined>();

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      const res = await fetch('/api/v1/crm/partners?' + params);
      if (res.ok) { const d = await res.json(); setPartners(d.data ?? []); } else message.error('Failed to load partners');
    } catch { message.error('Network error'); }
    finally { setLoading(false); }
  }, [message, search]);
  useEffect(() => { fetchPartners(); }, [fetchPartners]);
  useEffect(() => {
    fetch('/api/v1/sales/customers?limit=200').then(r => r.json()).then(d => setCustomers(d.data ?? [])).catch(() => {});
    fetch('/api/v1/procurement/vendors?limit=200').then(r => r.json()).then(d => setVendors(d.data ?? [])).catch(() => {});
    fetch('/api/v1/crm/companies?limit=200').then(r => r.json()).then(d => setCompanies(d.data ?? [])).catch(() => {});
  }, []);

  const openDrawer = useCallback(async (id: number) => {
    setDrawerId(id); setDetail(null); setDetailLoading(true);
    try { const res = await fetch('/api/v1/crm/partners/' + id); if (res.ok) setDetail(await res.json()); } catch {}
    finally { setDetailLoading(false); }
  }, []);

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/crm/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (res.ok) { message.success('Partner created'); setCreateOpen(false); form.resetFields(); fetchPartners(); }
      else { const e = await res.json(); message.error(e?.error?.message ?? 'Failed'); }
    } catch { message.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const doLink = async () => {
    if (!drawerId || !linkRecord) { message.warning('Pick a record to link'); return; }
    try {
      const res = await fetch('/api/v1/crm/partners/' + drawerId + '/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: linkKind, recordId: linkRecord }) });
      if (res.ok) { message.success('Linked'); setLinkRecord(undefined); openDrawer(drawerId); }
      else { const e = await res.json(); message.error(e?.error?.message ?? 'Link failed'); }
    } catch { message.error('Network error'); }
  };

  const linkOpts = linkKind === 'customer' ? customers : linkKind === 'vendor' ? vendors : companies;

  const columns: ColumnsType<Partner> = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Roles', dataIndex: 'roles', width: 110, render: (r: string) => <Tag color={ROLE_COLOR[r]}>{r.toUpperCase()}</Tag> },
    { title: 'Tax ID', dataIndex: 'taxId', width: 140, render: (v: string | null) => v ?? '—' },
    { title: 'Contacts', dataIndex: 'contactCount', align: 'right', width: 90 },
    { title: 'Status', dataIndex: 'active', width: 100, render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'ACTIVE' : 'ARCHIVED'}</Tag> },
    { title: '', key: 'a', width: 120, render: (_: unknown, p) => <Button size="small" onClick={() => openDrawer(p.id)}>360° View</Button> },
  ];

  const actTable = (data: any[], cols: ColumnsType<any>, title: string) => (
    <>
      <Divider titlePlacement="start" style={{ margin: '14px 0 8px' }}>{title} ({data.length})</Divider>
      <Table size="small" pagination={false} rowKey="id" dataSource={data} columns={cols} locale={{ emptyText: 'None' }} />
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Business Partners</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search placeholder="Search name or tax ID" allowClear style={{ width: 220 }} onSearch={setSearch} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New Partner</Button>
        </div>
      </div>
      <Table columns={columns} dataSource={partners} rowKey="id" loading={loading} size="small" />

      <Modal title="New Business Partner" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden width={520}>
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="roles" label="Roles" initialValue="both"><Select options={[{ value: 'customer', label: 'Customer' }, { value: 'vendor', label: 'Vendor' }, { value: 'both', label: 'Both' }]} /></Form.Item>
          <Form.Item name="taxId" label="Tax ID"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={detail?.name ?? 'Partner'} size="large" open={drawerId != null} onClose={() => setDrawerId(null)}>
        {detailLoading || !detail ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          <div>
            <Space size="large" wrap style={{ marginBottom: 16 }}>
              <Tag color={ROLE_COLOR[detail.roles]}>{String(detail.roles).toUpperCase()}</Tag>
              {detail.taxId && <span>Tax ID: {detail.taxId}</span>}
              {detail.email && <span>{detail.email}</span>}
              {detail.phone && <span>{detail.phone}</span>}
            </Space>
            <div style={{ display: 'flex', gap: 1, marginBottom: 8, border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '12px 16px', background: 'var(--surface, #fafafa)' }}><div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase' }}>AR Outstanding</div><div style={{ fontSize: 18, fontWeight: 600 }}>{money(detail.activity.totals.arOutstanding)}</div></div>
              <div style={{ flex: 1, padding: '12px 16px', background: 'var(--surface, #fafafa)' }}><div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase' }}>AP Outstanding</div><div style={{ fontSize: 18, fontWeight: 600 }}>{money(detail.activity.totals.apOutstanding)}</div></div>
            </div>

            <Divider titlePlacement="start" style={{ margin: '14px 0 8px' }}>Linked Records</Divider>
            <Space wrap style={{ marginBottom: 12 }}>
              {detail.links.customers.map((c: any) => <Tag key={'c' + c.id} color="blue">Customer: {c.name}</Tag>)}
              {detail.links.vendors.map((v: any) => <Tag key={'v' + v.id} color="gold">Vendor: {v.name}</Tag>)}
              {detail.links.companies.map((c: any) => <Tag key={'co' + c.id} color="purple">Company: {c.name}</Tag>)}
              {!detail.links.customers.length && !detail.links.vendors.length && !detail.links.companies.length && <span style={{ opacity: 0.5 }}>No links yet</span>}
            </Space>
            <Space.Compact style={{ display: 'flex' }}>
              <Select value={linkKind} onChange={v => { setLinkKind(v); setLinkRecord(undefined); }} style={{ width: 130 }} options={[{ value: 'customer', label: 'Customer' }, { value: 'vendor', label: 'Vendor' }, { value: 'company', label: 'Company' }]} />
              <Select showSearch value={linkRecord} onChange={setLinkRecord} placeholder="Select a record to link" style={{ flex: 1 }} options={linkOpts.map(o => ({ value: o.id, label: o.name }))} filterOption={(i, o) => (o?.label as string ?? '').toLowerCase().includes(i.toLowerCase())} />
              <Button type="primary" onClick={doLink}>Link</Button>
            </Space.Compact>

            {actTable(detail.activity.salesOrders, [{ title: 'Order', dataIndex: 'orderNumber' }, { title: 'Status', dataIndex: 'status' }, { title: 'Total', dataIndex: 'totalAmount', align: 'right', render: money }], 'Sales Orders')}
            {actTable(detail.activity.arInvoices, [{ title: 'Invoice', dataIndex: 'invoiceNumber' }, { title: 'Status', dataIndex: 'status' }, { title: 'Outstanding', dataIndex: 'outstanding', align: 'right', render: money }], 'AR Invoices')}
            {actTable(detail.activity.apInvoices, [{ title: 'Bill', dataIndex: 'invoiceNumber' }, { title: 'Status', dataIndex: 'status' }, { title: 'Outstanding', dataIndex: 'outstanding', align: 'right', render: money }], 'AP Invoices')}
            {actTable(detail.activity.purchaseRequests, [{ title: 'PR', dataIndex: 'number' }, { title: 'Status', dataIndex: 'status' }], 'Purchase Requests')}
          </div>
        )}
      </Drawer>
    </div>
  );
}
