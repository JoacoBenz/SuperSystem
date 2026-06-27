import { describe, it, expect } from 'vitest';
import {
  createPurchaseRequestSchema,
  updatePurchaseRequestSchema,
  transitionSchema,
} from '../validators/purchase-request.schema';

// ── createPurchaseRequestSchema ──────────────────────────────────────────────

describe('createPurchaseRequestSchema', () => {
  const validPayload = {
    title: 'Office Supplies Q2',
    description: 'Monthly office supply replenishment for the engineering department.',
    justification: 'Stock depleted, needed for daily operations.',
    urgency: 'normal' as const,
    items: [
      { description: 'Ballpoint pens (box)', quantity: 5, unit: 'box', estimatedPrice: 12.5 },
    ],
  };

  it('accepts a fully valid payload', () => {
    expect(() => createPurchaseRequestSchema.parse(validPayload)).not.toThrow();
  });

  it('defaults urgency to "normal" when omitted', () => {
    const { urgency, ...rest } = validPayload;
    const result = createPurchaseRequestSchema.parse(rest);
    expect(result.urgency).toBe('normal');
  });

  it('defaults action to "draft" when omitted', () => {
    const result = createPurchaseRequestSchema.parse(validPayload);
    expect(result.action).toBe('draft');
  });

  it('accepts action "submit"', () => {
    const result = createPurchaseRequestSchema.parse({ ...validPayload, action: 'submit' });
    expect(result.action).toBe('submit');
  });

  it('rejects title shorter than 3 characters', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({ ...validPayload, title: 'Ab' }),
    ).toThrow();
  });

  it('rejects description shorter than 10 characters', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({ ...validPayload, description: 'Too short' }),
    ).toThrow();
  });

  it('rejects justification shorter than 10 characters', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({ ...validPayload, justification: 'Short' }),
    ).toThrow();
  });

  it('rejects empty items array', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({ ...validPayload, items: [] }),
    ).toThrow();
  });

  it('rejects item with zero quantity', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({
        ...validPayload,
        items: [{ description: 'Pens', quantity: 0, unit: 'box' }],
      }),
    ).toThrow();
  });

  it('rejects item with negative quantity', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({
        ...validPayload,
        items: [{ description: 'Pens', quantity: -3, unit: 'box' }],
      }),
    ).toThrow();
  });

  it('rejects item with invalid productUrl', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({
        ...validPayload,
        items: [{ description: 'Pens', quantity: 1, unit: 'box', productUrl: 'not-a-url' }],
      }),
    ).toThrow();
  });

  it('accepts item with valid productUrl', () => {
    const result = createPurchaseRequestSchema.parse({
      ...validPayload,
      items: [{ description: 'Pens', quantity: 1, unit: 'box', productUrl: 'https://example.com/product' }],
    });
    expect(result.items[0].productUrl).toBe('https://example.com/product');
  });

  it('accepts null vendorId and costCenterId', () => {
    const result = createPurchaseRequestSchema.parse({
      ...validPayload,
      vendorId: null,
      costCenterId: null,
    });
    expect(result.vendorId).toBeNull();
    expect(result.costCenterId).toBeNull();
  });

  it('rejects invalid urgency value', () => {
    expect(() =>
      createPurchaseRequestSchema.parse({ ...validPayload, urgency: 'urgent' }),
    ).toThrow();
  });

  it('accepts all valid urgency values', () => {
    for (const urgency of ['low', 'normal', 'high', 'critical'] as const) {
      expect(() =>
        createPurchaseRequestSchema.parse({ ...validPayload, urgency }),
      ).not.toThrow();
    }
  });

  it('multiple items are accepted', () => {
    const result = createPurchaseRequestSchema.parse({
      ...validPayload,
      items: [
        { description: 'Pens', quantity: 5, unit: 'box' },
        { description: 'Notebooks', quantity: 10, unit: 'units', estimatedPrice: 3.5 },
      ],
    });
    expect(result.items).toHaveLength(2);
  });
});

// ── updatePurchaseRequestSchema ──────────────────────────────────────────────

describe('updatePurchaseRequestSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => updatePurchaseRequestSchema.parse({})).not.toThrow();
  });

  it('accepts a partial update with only title', () => {
    const result = updatePurchaseRequestSchema.parse({ title: 'New title here' });
    expect(result.title).toBe('New title here');
  });

  it('rejects title shorter than 3 characters when provided', () => {
    expect(() => updatePurchaseRequestSchema.parse({ title: 'Ab' })).toThrow();
  });

  it('accepts version for optimistic locking', () => {
    const result = updatePurchaseRequestSchema.parse({ version: 3 });
    expect(result.version).toBe(3);
  });

  it('rejects non-integer version', () => {
    expect(() => updatePurchaseRequestSchema.parse({ version: 1.5 })).toThrow();
  });

  it('accepts item updates with optional id', () => {
    const result = updatePurchaseRequestSchema.parse({
      items: [{ id: 42, description: 'Updated item', quantity: 2, unit: 'kg' }],
    });
    expect(result.items![0].id).toBe(42);
  });

  it('rejects items array with zero items when provided', () => {
    expect(() => updatePurchaseRequestSchema.parse({ items: [] })).toThrow();
  });
});

// ── transitionSchema ─────────────────────────────────────────────────────────

describe('transitionSchema', () => {
  it('accepts a minimal transition with just action', () => {
    const result = transitionSchema.parse({ action: 'submit' });
    expect(result.action).toBe('submit');
  });

  it('accepts transition with notes', () => {
    const result = transitionSchema.parse({ action: 'return', notes: 'Missing justification' });
    expect(result.notes).toBe('Missing justification');
  });

  it('accepts transition with version', () => {
    const result = transitionSchema.parse({ action: 'approve', version: 5 });
    expect(result.version).toBe(5);
  });

  it('rejects empty action string', () => {
    expect(() => transitionSchema.parse({ action: '' })).toThrow();
  });

  it('rejects missing action', () => {
    expect(() => transitionSchema.parse({})).toThrow();
  });
});
