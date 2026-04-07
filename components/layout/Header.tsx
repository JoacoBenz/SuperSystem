'use client';

import { Layout, Button, Space, Dropdown, Avatar, Typography, theme } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { signOut } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { NotificationBell } from './NotificationBell';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  userName: string;
  orgRole: string;
}

export function Header({ collapsed, setCollapsed, userName, orgRole }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  const userMenuItems = [
    { key: 'role', label: <Text type="secondary">{orgRole}</Text>, disabled: true },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', onClick: () => signOut({ callbackUrl: '/login' }) },
  ];

  return (
    <AntHeader style={{
      padding: '0 24px',
      background: token.colorBgContainer,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
    }}>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
      />
      <Space size="middle">
        <Button
          type="text"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
        />
        <NotificationBell />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} size="small" />
            <Text>{userName}</Text>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
