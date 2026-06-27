import { describe, it, expect } from 'vitest';
import { variance, isOverBudget, utilization, summarizeBudgetItems } from '../variance';

describe('budget – variance', () => {
  it('is negative when under budget', () => {
    expect(variance(80000, 34800)).toBe(-45200);
  });

  it('is positive when over budget', () => {
    expect(variance(10000, 12500)).toBe(2500);
  });

  it('is zero when actual equals planned', () => {
    expect(variance(5000, 5000)).toBe(0);
  });
});

describe('budget – isOverBudget', () => {
  it('false when under', () => {
    expect(isOverBudget(80000, 34800)).toBe(false);
  });

  it('false when exactly on budget', () => {
    expect(isOverBudget(5000, 5000)).toBe(false);
  });

  it('true when over', () => {
    expect(isOverBudget(5000, 5001)).toBe(true);
  });
});

describe('budget – utilization', () => {
  it('computes the spent fraction', () => {
    expect(utilization(100000, 25000)).toBe(0.25);
  });

  it('returns 0 when nothing is planned (no division by zero)', () => {
    expect(utilization(0, 5000)).toBe(0);
  });

  it('can exceed 1 when over budget', () => {
    expect(utilization(100, 150)).toBe(1.5);
  });
});

describe('budget – summarizeBudgetItems', () => {
  it('rolls up planned/actual totals and variance (FY2026 operating budget)', () => {
    const items = [
      { plannedAmount: 300000, actualAmount: 122500 },
      { plannedAmount: 50000, actualAmount: 18200 },
      { plannedAmount: 80000, actualAmount: 34800 },
    ];
    expect(summarizeBudgetItems(items)).toEqual({
      totalPlanned: 430000,
      totalActual: 175500,
      variance: -254500,
      overBudget: false,
    });
  });

  it('flags a set of lines that collectively overrun', () => {
    const items = [
      { plannedAmount: 1000, actualAmount: 1500 },
      { plannedAmount: 500, actualAmount: 400 },
    ];
    const s = summarizeBudgetItems(items);
    expect(s.totalPlanned).toBe(1500);
    expect(s.totalActual).toBe(1900);
    expect(s.variance).toBe(400);
    expect(s.overBudget).toBe(true);
  });

  it('handles an empty list', () => {
    expect(summarizeBudgetItems([])).toEqual({
      totalPlanned: 0,
      totalActual: 0,
      variance: 0,
      overBudget: false,
    });
  });
});
