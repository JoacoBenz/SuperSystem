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

const PRIMARY_ACTIONS = ['approve', 'validate', 'start_procurement', 'schedule_payment', 'record_purchase', 'record_reception', 'close', 'submit'];
const DANGER_ACTIONS = ['reject', 'cancel'];

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
            const isPrimary = PRIMARY_ACTIONS.includes(action);
            const isDanger = DANGER_ACTIONS.includes(action);
            const btn = (
              <Button
                key={action}
                type={isPrimary ? 'primary' : 'default'}
                danger={isDanger}
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
