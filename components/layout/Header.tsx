'use client';

import { Layout, Button, Space, Dropdown, Avatar, Typography, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { signOut } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { NotificationBell } from './NotificationBell';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  member: 'Member',
};

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  userName: string;
  orgRole: string;
}

export function Header({ collapsed, setCollapsed, userName, orgRole }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  const initials = userName
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const roleLabel = ROLE_LABELS[orgRole] ?? orgRole;

  const userMenuItems = [
    { key: 'name', label: <Text strong>{userName}</Text>, disabled: true },
    { key: 'role', label: <Text type="secondary" style={{ fontSize: 12 }}>{roleLabel}</Text>, disabled: true },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', onClick: () => signOut({ callbackUrl: '/login' }) },
  ];

  return (
    <AntHeader
      style={{
        padding: '0 16px 0 12px',
        background: token.colorBgContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{ fontSize: 16, width: 40, height: 40 }}
      />
      <Space size={4} align="center">
        <Button
          type="text"
          shape="circle"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        />
        <NotificationBell />
        <div style={{ width: 1, height: 26, background: token.colorBorderSecondary, margin: '0 8px' }} />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <div
            className="user-chip"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 10px 5px 6px',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            <Avatar
              size={34}
              style={{
                background: '#4f46e5',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {initials || <UserOutlined />}
            </Avatar>
            <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{userName}</div>
              <div style={{ fontSize: 11, color: token.colorTextTertiary }}>{roleLabel}</div>
            </div>
            <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary, marginLeft: 2 }} />
          </div>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
