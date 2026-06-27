'use client';

import { Badge, Button, Popover, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';

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

  const fetchNotifications = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        fetch('/api/v1/core/notifications?count_only=true&unread=true'),
        open ? fetch('/api/v1/core/notifications?limit=10') : Promise.resolve(null),
      ]);
      const countData = await countRes.json();
      setUnreadCount(countData.count ?? 0);

      if (listRes) {
        const listData = await listRes.json();
        setNotifications(listData.data ?? []);
      }
    } catch {}
  }, [open]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    await fetch(`/api/v1/core/notifications/${id}`, { method: 'PATCH' });
    fetchNotifications();
  };

  const content = (
    <div style={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      {notifications.length === 0 ? (
        <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div>
          {notifications.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => !item.read && markAsRead(item.id)}
              style={{
                cursor: item.read ? 'default' : 'pointer',
                background: item.read ? 'transparent' : 'rgba(79,70,229,0.06)',
                padding: '10px 12px',
                borderTop: idx === 0 ? 'none' : '1px solid #ecedf1',
              }}
            >
              <div style={{ fontWeight: item.read ? 400 : 600, fontSize: 13, color: '#16181d' }}>{item.title}</div>
              {item.message && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.message}</div>
              )}
              <div style={{ fontSize: 11, color: '#9aa0ac', marginTop: 3 }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
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
