import { describe, it, expect } from 'vitest';
import { purchaseRequestWorkflow } from '../workflows/purchase-request.workflow';
import type { PurchaseRequestWorkflowContext } from '../types';

// Base context for tests — different user IDs simulate distinct actors
const makeCtx = (overrides: Partial<PurchaseRequestWorkflowContext> = {}): PurchaseRequestWorkflowContext => ({
  userId: 1,
  requesterId: 1,
  validatedById: null,
  approvedById: null,
  departmentId: 10,
  estimatedTotal: 500,
  hasBuyerUsers: true,
  receptionConforming: true,
  allItemsReceived: true,
  hasIssues: false,
  ...overrides,
});

// ── State machine metadata ──────────────────────────────────────────────────

describe('StateMachine – metadata', () => {
  it('initial state is draft', () => {
    expect(purchaseRequestWorkflow.initial).toBe('draft');
  });

  it('draft is editable', () => {
    expect(purchaseRequestWorkflow.isEditable('draft')).toBe(true);
  });

  it('returned_by_validator is editable', () => {
    expect(purchaseRequestWorkflow.isEditable('returned_by_validator')).toBe(true);
  });

  it('returned_by_approver is editable', () => {
    expect(purchaseRequestWorkflow.isEditable('returned_by_approver')).toBe(true);
  });

  it('submitted is NOT editable', () => {
    expect(purchaseRequestWorkflow.isEditable('submitted')).toBe(false);
  });

  it('terminal states are terminal', () => {
    expect(purchaseRequestWorkflow.isTerminal('rejected')).toBe(true);
    expect(purchaseRequestWorkflow.isTerminal('cancelled')).toBe(true);
    expect(purchaseRequestWorkflow.isTerminal('closed')).toBe(true);
  });

  it('non-terminal states are not terminal', () => {
    expect(purchaseRequestWorkflow.isTerminal('draft')).toBe(false);
    expect(purchaseRequestWorkflow.isTerminal('approved')).toBe(false);
  });
});

// ── Happy path: full procurement lifecycle ──────────────────────────────────

describe('Happy path – full lifecycle (draft → closed)', () => {
  it('draft → submitted via submit', async () => {
    // Requester submits their own request (userId === requesterId)
    const { newState } = await purchaseRequestWorkflow.transition('draft', 'submit', makeCtx({ userId: 1, requesterId: 1 }));
    expect(newState).toBe('submitted');
  });

  it('submitted → validated via validate (different user)', async () => {
    const { newState } = await purchaseRequestWorkflow.transition('submitted', 'validate', makeCtx({ userId: 2, requesterId: 1 }));
    expect(newState).toBe('validated');
  });

  it('validated → in_procurement via approve (when hasBuyerUsers=true)', async () => {
    // Approver is user 3 (not requester=1, not validator=2)
    const { newState } = await purchaseRequestWorkflow.transition(
      'validated',
      'approve',
      makeCtx({ userId: 3, requesterId: 1, validatedById: 2, hasBuyerUsers: true }),
    );
    expect(newState).toBe('in_procurement');
  });

  it('validated → approved via approve (when hasBuyerUsers=false)', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'validated',
      'approve',
      makeCtx({ userId: 3, requesterId: 1, validatedById: 2, hasBuyerUsers: false }),
    );
    expect(newState).toBe('approved');
  });

  it('in_procurement → purchased via record_purchase', async () => {
    // Buyer (user 4) is not the approver (user 3)
    const { newState } = await purchaseRequestWorkflow.transition(
      'in_procurement',
      'record_purchase',
      makeCtx({ userId: 4, approvedById: 3 }),
    );
    expect(newState).toBe('purchased');
  });

  it('purchased → received via record_reception (all items, no issues)', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'purchased',
      'record_reception',
      makeCtx({ allItemsReceived: true, hasIssues: false }),
    );
    expect(newState).toBe('received');
  });

  it('received → closed via close', async () => {
    const { newState } = await purchaseRequestWorkflow.transition('received', 'close', makeCtx());
    expect(newState).toBe('closed');
  });
});

// ── Return flows ────────────────────────────────────────────────────────────

describe('Return flows', () => {
  it('submitted → returned_by_validator via return', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'submitted', 'return', makeCtx({ userId: 2, requesterId: 1 }),
    );
    expect(newState).toBe('returned_by_validator');
  });

  it('returned_by_validator → submitted via submit (requester resubmits)', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'returned_by_validator', 'submit', makeCtx({ userId: 1, requesterId: 1 }),
    );
    expect(newState).toBe('submitted');
  });

  it('validated → returned_by_approver via return', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'validated', 'return', makeCtx({ userId: 3, requesterId: 1, validatedById: 2 }),
    );
    expect(newState).toBe('returned_by_approver');
  });

  it('returned_by_approver → submitted via submit (requester resubmits)', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'returned_by_approver', 'submit', makeCtx({ userId: 1, requesterId: 1 }),
    );
    expect(newState).toBe('submitted');
  });
});

// ── Rejection ───────────────────────────────────────────────────────────────

describe('Rejection flow', () => {
  it('submitted → rejected via reject', async () => {
    const { newState } = await purchaseRequestWorkflow.transition('submitted', 'reject', makeCtx());
    expect(newState).toBe('rejected');
  });

  it('validated → rejected via reject', async () => {
    const { newState } = await purchaseRequestWorkflow.transition('validated', 'reject', makeCtx());
    expect(newState).toBe('rejected');
  });
});

// ── Cancellation ─────────────────────────────────────────────────────────────

describe('Cancellation flow', () => {
  const cancellableStates = ['draft', 'submitted', 'validated', 'approved', 'in_procurement', 'payment_scheduled'];

  for (const state of cancellableStates) {
    it(`${state} → cancelled via cancel`, async () => {
      const { newState } = await purchaseRequestWorkflow.transition(state, 'cancel', makeCtx());
      expect(newState).toBe('cancelled');
    });
  }

  it('received cannot be cancelled', async () => {
    await expect(
      purchaseRequestWorkflow.transition('received', 'cancel', makeCtx()),
    ).rejects.toThrow();
  });
});

// ── Partial / issues reception ───────────────────────────────────────────────

describe('Record reception – branching', () => {
  it('partial reception stays in purchased', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'purchased', 'record_reception',
      makeCtx({ allItemsReceived: false, hasIssues: false }),
    );
    expect(newState).toBe('purchased');
  });

  it('full reception with issues → received_with_issues', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'purchased', 'record_reception',
      makeCtx({ allItemsReceived: true, hasIssues: true }),
    );
    expect(newState).toBe('received_with_issues');
  });

  it('received_with_issues → closed via close', async () => {
    const { newState } = await purchaseRequestWorkflow.transition('received_with_issues', 'close', makeCtx());
    expect(newState).toBe('closed');
  });
});

// ── Guard: is_owner ──────────────────────────────────────────────────────────

describe('Guard – is_owner (submit)', () => {
  it('requester can submit their own request', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'draft', 'submit', makeCtx({ userId: 5, requesterId: 5 }),
    );
    expect(newState).toBe('submitted');
  });

  it('another user cannot submit someone else\'s request', async () => {
    await expect(
      purchaseRequestWorkflow.transition('draft', 'submit', makeCtx({ userId: 99, requesterId: 1 })),
    ).rejects.toThrow('Guard "is_owner" failed');
  });
});

// ── Segregation of duties (enforced inside the engine) ───────────────────────

describe('Segregation of duties', () => {
  it('requester cannot validate their own request', async () => {
    await expect(
      purchaseRequestWorkflow.transition('submitted', 'validate', makeCtx({ userId: 1, requesterId: 1 })),
    ).rejects.toThrow('segregation_of_duties');
  });

  it('a different user can validate the request', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'submitted', 'validate', makeCtx({ userId: 2, requesterId: 1 }),
    );
    expect(newState).toBe('validated');
  });

  it('requester cannot approve their own request', async () => {
    await expect(
      purchaseRequestWorkflow.transition(
        'validated', 'approve', makeCtx({ userId: 1, requesterId: 1, validatedById: 2 }),
      ),
    ).rejects.toThrow('segregation_of_duties');
  });

  it('validator cannot approve a request they validated', async () => {
    await expect(
      purchaseRequestWorkflow.transition(
        'validated', 'approve', makeCtx({ userId: 2, requesterId: 1, validatedById: 2 }),
      ),
    ).rejects.toThrow('segregation_of_duties');
  });

  it('a third user (not requester or validator) can approve', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'validated', 'approve', makeCtx({ userId: 3, requesterId: 1, validatedById: 2 }),
    );
    expect(newState).toBe('in_procurement'); // hasBuyerUsers=true by default
  });

  it('approver cannot purchase (record_purchase)', async () => {
    await expect(
      purchaseRequestWorkflow.transition(
        'in_procurement', 'record_purchase', makeCtx({ userId: 3, approvedById: 3 }),
      ),
    ).rejects.toThrow('segregation_of_duties');
  });

  it('a different user can record_purchase', async () => {
    const { newState } = await purchaseRequestWorkflow.transition(
      'in_procurement', 'record_purchase', makeCtx({ userId: 4, approvedById: 3 }),
    );
    expect(newState).toBe('purchased');
  });
});

// ── Invalid transitions ───────────────────────────────────────────────────────

describe('Invalid transitions', () => {
  it('cannot submit from approved', async () => {
    await expect(
      purchaseRequestWorkflow.transition('approved', 'submit', makeCtx()),
    ).rejects.toThrow('No transition');
  });

  it('cannot validate from draft', async () => {
    await expect(
      purchaseRequestWorkflow.transition('draft', 'validate', makeCtx()),
    ).rejects.toThrow('No transition');
  });

  it('cannot record_reception from submitted', async () => {
    await expect(
      purchaseRequestWorkflow.transition('submitted', 'record_reception', makeCtx()),
    ).rejects.toThrow('No transition');
  });

  it('cannot transition from terminal state rejected', async () => {
    await expect(
      purchaseRequestWorkflow.transition('rejected', 'submit', makeCtx()),
    ).rejects.toThrow('No transition');
  });

  it('cannot transition from terminal state closed', async () => {
    await expect(
      purchaseRequestWorkflow.transition('closed', 'cancel', makeCtx()),
    ).rejects.toThrow('No transition');
  });
});

// ── getAvailableTransitions ──────────────────────────────────────────────────

describe('getAvailableTransitions', () => {
  it('draft with submit permission exposes submit and cancel', () => {
    const perms = new Set(['procurement.purchase_request.submit', 'procurement.purchase_request.cancel']);
    const available = purchaseRequestWorkflow.getAvailableTransitions('draft', perms);
    const actions = available.map(t => t.action);
    expect(actions).toContain('submit');
    expect(actions).toContain('cancel');
    expect(actions).not.toContain('validate');
  });

  it('no permissions → no available transitions', () => {
    const available = purchaseRequestWorkflow.getAvailableTransitions('draft', new Set());
    expect(available).toHaveLength(0);
  });

  it('submitted with validate permission exposes validate, return, reject', () => {
    const perms = new Set([
      'procurement.purchase_request.validate',
      'procurement.purchase_request.return',
      'procurement.purchase_request.reject',
    ]);
    const available = purchaseRequestWorkflow.getAvailableTransitions('submitted', perms);
    const actions = available.map(t => t.action);
    expect(actions).toContain('validate');
    expect(actions).toContain('return');
    expect(actions).toContain('reject');
  });
});
