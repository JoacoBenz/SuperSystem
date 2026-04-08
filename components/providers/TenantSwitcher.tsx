'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Select, Space, Typography, Tag } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: string;
}

interface TenantSwitcherContextType {
  selectedTenantId: number | null;
  setSelectedTenantId: (id: number) => void;
  tenantParam: string;
  tenants: Tenant[];
  loading: boolean;
}

const TenantSwitcherContext = createContext<TenantSwitcherContextType>({
  selectedTenantId: null,
  setSelectedTenantId: () => {},
  tenantParam: '',
  tenants: [],
  loading: true,
});

export function useTenantSwitcher() {
  return useContext(TenantSwitcherContext);
}

interface TenantSwitcherProviderProps {
  orgRole: string;
  children: ReactNode;
}

export function TenantSwitcherProvider({ orgRole, children }: TenantSwitcherProviderProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgRole !== 'super_admin') {
      setLoading(false);
      return;
    }
    fetch('/api/v1/core/tenants')
      .then(r => r.json())
      .then(data => {
        const list: Tenant[] = (Array.isArray(data) ? data : data.data ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
        }));
        setTenants(list);
        if (list.length > 0) setSelectedTenantId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgRole]);

  const tenantParam = orgRole === 'super_admin' && selectedTenantId
    ? `tenant_id=${selectedTenantId}`
    : '';

  return (
    <TenantSwitcherContext.Provider value={{ selectedTenantId, setSelectedTenantId, tenantParam, tenants, loading }}>
      {children}
    </TenantSwitcherContext.Provider>
  );
}

export function TenantSwitcherBar() {
  const { selectedTenantId, setSelectedTenantId, tenants } = useTenantSwitcher();
  const pathname = usePathname();

  const hideSwitcher = pathname === '/admin/tenants' || pathname === '/';
  if (tenants.length === 0 || hideSwitcher) return null;

  return (
    <div style={{
      padding: '8px 16px',
      background: 'var(--ant-color-bg-container)',
      borderBottom: '1px solid var(--ant-color-border-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <SwapOutlined style={{ color: 'var(--ant-color-primary)' }} />
      <Text strong style={{ whiteSpace: 'nowrap' }}>Viewing tenant:</Text>
      <Select
        value={selectedTenantId}
        onChange={setSelectedTenantId}
        style={{ minWidth: 220 }}
        options={tenants.map(t => ({
          value: t.id,
          label: (
            <Space>
              <span>{t.name}</span>
              <Tag color={t.status === 'active' ? 'green' : 'red'} style={{ marginInlineEnd: 0 }}>{t.slug}</Tag>
            </Space>
          ),
        }))}
      />
    </div>
  );
}
