import type { SegregationRule } from './types';

export function checkSegregation(
  rule: SegregationRule,
  userId: number,
  resource: Record<string, unknown>
): { allowed: boolean; reason?: string } {
  for (const actor of rule.conflictingActors) {
    if (resource[actor.field] === userId) {
      return {
        allowed: false,
        reason: `Cannot perform this action: you are the ${actor.label}`,
      };
    }
  }
  return { allowed: true };
}

// Procurement-specific segregation rules
export const PROCUREMENT_SEGREGATION: Record<string, SegregationRule> = {
  validate: {
    id: 'validate',
    description: 'Cannot validate own request',
    conflictingActors: [{ field: 'requesterId', label: 'requester' }],
  },
  approve: {
    id: 'approve',
    description: 'Cannot approve if requester or validator',
    conflictingActors: [
      { field: 'requesterId', label: 'requester' },
      { field: 'validatedById', label: 'validator' },
    ],
  },
  purchase: {
    id: 'purchase',
    description: 'Cannot purchase if approver',
    conflictingActors: [{ field: 'approvedById', label: 'approver' }],
  },
};
