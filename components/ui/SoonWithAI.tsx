'use client';

import { Tooltip } from 'antd';
import { ThunderboltFilled } from '@ant-design/icons';

interface SoonWithAIProps {
  /** Short feature name shown bold at the top of the tooltip, e.g. "Lead Scoring". */
  feature: string;
  /** One-line explanation of what the AI will do, shown in the tooltip. */
  description: string;
  /** Compact variant for placing inside table headers or dense rows. */
  size?: 'small' | 'default';
}

/**
 * A pill that marks a spot in the UI where an AI capability is planned.
 * Hover reveals what the feature will do. Purely presentational — no behavior yet.
 */
export function SoonWithAI({ feature, description, size = 'default' }: SoonWithAIProps) {
  const small = size === 'small';
  return (
    <Tooltip
      title={
        <span>
          <strong>{feature}</strong>
          <br />
          {description}
        </span>
      }
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: small ? '0 7px' : '1px 10px',
          fontSize: small ? 11 : 12,
          fontWeight: 600,
          lineHeight: 1.7,
          color: '#fff',
          background: 'linear-gradient(90deg, #7c3aed 0%, #2563eb 100%)',
          borderRadius: 999,
          cursor: 'help',
          userSelect: 'none',
          verticalAlign: 'middle',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 4px rgba(124,58,237,0.35)',
        }}
      >
        <ThunderboltFilled style={{ fontSize: small ? 10 : 11 }} />
        Soon with AI
      </span>
    </Tooltip>
  );
}
