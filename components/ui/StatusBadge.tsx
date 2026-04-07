'use client';

import { Tag } from 'antd';

interface StatusBadgeProps {
  status: string;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
}

const DEFAULT_COLORS: Record<string, string> = {
  draft: 'default',
  active: 'success',
  inactive: 'default',
  pending: 'processing',
  approved: 'blue',
  rejected: 'red',
  cancelled: 'default',
  closed: 'success',
};

export function StatusBadge({ status, labels, colors }: StatusBadgeProps) {
  const label = labels?.[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const color = colors?.[status] ?? DEFAULT_COLORS[status] ?? 'default';

  return <Tag color={color}>{label}</Tag>;
}
