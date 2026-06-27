import { describe, it, expect } from 'vitest';
import { transactionDelta, applyTransaction, reverseTransaction } from '../balance';

describe('treasury balance – transactionDelta', () => {
  it('credit is a positive delta', () => {
    expect(transactionDelta(100, 'credit')).toBe(100);
  });

  it('debit is a negative delta', () => {
    expect(transactionDelta(100, 'debit')).toBe(-100);
  });

  it('handles decimal amounts', () => {
    expect(transactionDelta(12.5, 'credit')).toBe(12.5);
    expect(transactionDelta(12.5, 'debit')).toBe(-12.5);
  });

  it('zero stays zero for both types', () => {
    expect(transactionDelta(0, 'credit')).toBe(0);
    expect(transactionDelta(0, 'debit')).toBe(-0);
  });
});

describe('treasury balance – applyTransaction', () => {
  it('credit increases the balance', () => {
    expect(applyTransaction(125000, 10000, 'credit')).toBe(135000);
  });

  it('debit decreases the balance', () => {
    expect(applyTransaction(125000, 8000, 'debit')).toBe(117000);
  });

  it('allows the balance to go negative (overdraft)', () => {
    expect(applyTransaction(50, 200, 'debit')).toBe(-150);
  });

  it('is the inverse of reverseTransaction', () => {
    const start = 1000;
    const afterApply = applyTransaction(start, 250, 'credit');
    expect(reverseTransaction(afterApply, 250, 'credit')).toBe(start);

    const afterDebit = applyTransaction(start, 250, 'debit');
    expect(reverseTransaction(afterDebit, 250, 'debit')).toBe(start);
  });
});

describe('treasury balance – reverseTransaction', () => {
  it('undoes a credit by subtracting', () => {
    expect(reverseTransaction(135000, 10000, 'credit')).toBe(125000);
  });

  it('undoes a debit by adding back', () => {
    expect(reverseTransaction(117000, 8000, 'debit')).toBe(125000);
  });
});
