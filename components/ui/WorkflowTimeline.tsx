'use client';

import { Timeline, Button, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TimelineEntry {
  state: string;
  label: string;
  timestamp?: string;
  actor?: string;
}

interface AvailableAction {
  action: string;
  label: string;
  permitted?: boolean;
}

interface WorkflowTimelineProps {
  entries: TimelineEntry[];
  currentState: string;
  availableActions?: AvailableAction[];
  onAction?: (action: string) => void;
  loading?: boolean;
}

export function WorkflowTimeline({ entries, currentState, availableActions = [], onAction, loading }: WorkflowTimelineProps) {
  const items = entries.map((entry, index) => ({
    color: index === entries.length - 1 ? 'blue' : 'green',
    icon: index === entries.length - 1 ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
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
  }));

  return (
    <div>
      <Timeline items={items} />
      {availableActions.length > 0 && (
        <Space wrap style={{ marginTop: 8 }}>
          {availableActions.map(({ action, label, permitted = true }) => {
            const btn = (
              <Button
                key={action}
                type={action === 'approve' || action === 'validate' || action === 'process' ? 'primary' : 'default'}
                danger={action === 'reject' || action === 'cancel'}
                onClick={() => permitted && onAction?.(action)}
                loading={loading}
                disabled={!permitted}
              >
                {label}
              </Button>
            );
            if (!permitted) {
              return (
                <Tooltip key={action} title="You don't have permission for this action">
                  {btn}
                </Tooltip>
              );
            }
            return btn;
          })}
        </Space>
      )}
    </div>
  );
}
