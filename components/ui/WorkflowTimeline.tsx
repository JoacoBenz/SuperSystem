'use client';

import { Timeline, Button, Space, Typography } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TimelineEntry {
  state: string;
  label: string;
  timestamp?: string;
  actor?: string;
}

interface WorkflowTimelineProps {
  entries: TimelineEntry[];
  currentState: string;
  availableActions?: Array<{ action: string; label: string }>;
  onAction?: (action: string) => void;
  loading?: boolean;
}

export function WorkflowTimeline({ entries, currentState, availableActions = [], onAction, loading }: WorkflowTimelineProps) {
  const FAIL_STATES = new Set(['rejected', 'cancelled']);
  const DONE_STATES = new Set(['closed', 'received_with_issues', 'received']);

  const items = entries.map((entry, index) => {
    const isLast = index === entries.length - 1;
    let color = 'green';
    let icon = <CheckCircleOutlined />;
    if (isLast) {
      if (FAIL_STATES.has(entry.state)) {
        color = 'red';
        icon = <CloseCircleOutlined />;
      } else if (DONE_STATES.has(entry.state)) {
        color = 'green';
        icon = <CheckCircleOutlined />;
      } else {
        color = 'blue';
        icon = <ClockCircleOutlined />;
      }
    }
    return {
      color,
      icon,
      content: (
        <div>
          <Text strong>{entry.label}</Text>
          {entry.actor && <Text type="secondary" style={{ marginLeft: 8 }}>by {entry.actor}</Text>}
          {entry.timestamp && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(entry.timestamp).toLocaleString()}
              </Text>
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div>
      <Timeline items={items} />
      {availableActions.length > 0 && (
        <Space wrap style={{ marginTop: 8 }}>
          {availableActions.map(({ action, label }) => (
            <Button
              key={action}
              type={action === 'approve' || action === 'validate' ? 'primary' : 'default'}
              danger={action === 'reject' || action === 'cancel'}
              onClick={() => onAction?.(action)}
              loading={loading}
            >
              {label}
            </Button>
          ))}
        </Space>
      )}
    </div>
  );
}
