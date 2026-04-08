'use client';

import { Badge, Button, Popover, List, Typography, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback, useRef } from 'react';

const { Text } = Typography;

interface Notification {
  id: number;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
  resourceType: string | null;
  resourceId: number | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/core/notifications?count_only=true&unread=true');
      const countData = await res.json();
      setUnreadCount(countData.count ?? 0);

      if (openRef.current) {
        const listRes = await fetch('/api/v1/core/notifications?limit=10');
        const listData = await listRes.json();
        setNotifications(listData.data ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (id: number) => {
    await fetch(`/api/v1/core/notifications/${id}`, { method: 'PATCH' });
    fetchNotifications();
  };

  const content = (
    <div style={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      {notifications.length === 0 ? (
        <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={notifications}
          renderItem={item => (
            <List.Item
              style={{ cursor: 'pointer', background: item.read ? 'transparent' : '#e6f4ff', padding: '8px 12px' }}
              onClick={() => !item.read && markAsRead(item.id)}
            >
              <List.Item.Meta
                title={<Text strong={!item.read}>{item.title}</Text>}
                description={<Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()}</Text>}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover content={content} title="Notifications" trigger="click" open={open} onOpenChange={setOpen}>
      <Badge count={unreadCount} size="small">
        <Button type="text" icon={<BellOutlined />} />
      </Badge>
    </Popover>
  );
}
