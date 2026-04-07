'use client';

import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  precision?: number;
  color?: string;
  loading?: boolean;
}

export function StatCard({ title, value, prefix, suffix, precision, color, loading }: StatCardProps) {
  return (
    <Card>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
        loading={loading}
        styles={color ? { content: { color } } : undefined}
      />
    </Card>
  );
}
