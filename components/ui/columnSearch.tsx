'use client';

import { useRef } from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';

export function useColumnSearch() {
  const searchInput = useRef<InputRef>(null);

  const getColumnSearchProps = (dataIndex: string, nested?: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0] as string}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button type="primary" onClick={() => confirm()} icon={<SearchOutlined />} size="small">Search</Button>
          <Button onClick={() => { clearFilters?.(); confirm(); }} size="small">Reset</Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />,
    onFilter: (value: any, record: any) => {
      const val = nested ? record[dataIndex]?.[nested] : record[dataIndex];
      return String(val ?? '').toLowerCase().includes(String(value).toLowerCase());
    },
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    },
  });

  return { getColumnSearchProps };
}
