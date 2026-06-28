import { describe, it, expect } from 'vitest';
import { computeAging, type AgingInvoice } from '../aging';

const asOf = new Date('2026-06-28T00:00:00Z');
const inv = (o: Partial<AgingInvoice> & { id: number; dueDate: string }): AgingInvoice => ({
  invoiceNumber: 'INV-' + o.id, partner: 'Acme', total: 100, paidAmount: 0, status: 'issued', ...o,
});

describe('computeAging', () => {
  it('buckets outstanding invoices by days past due', () => {
    const res = computeAging([
      inv({ id: 1, dueDate: '2026-07-10' }),  // future → current
      inv({ id: 2, dueDate: '2026-06-20' }),  // 8 days → 1–30
      inv({ id: 3, dueDate: '2026-05-20' }),  // 39 days → 31–60
      inv({ id: 4, dueDate: '2026-03-01' }),  // 119 days → 90+
    ], asOf);
    expect(res.buckets.current).toBe(100);
    expect(res.buckets.d1_30).toBe(100);
    expect(res.buckets.d31_60).toBe(100);
    expect(res.buckets.d90plus).toBe(100);
    expect(res.totalOutstanding).toBe(400);
    expect(res.rows).toHaveLength(4);
  });

  it('uses outstanding = total − paidAmount and skips settled / fully-paid', () => {
    const res = computeAging([
      inv({ id: 1, dueDate: '2026-06-20', total: 100, paidAmount: 30 }),            // 70 outstanding
      inv({ id: 2, dueDate: '2026-06-20', total: 100, paidAmount: 100, status: 'paid' }), // settled
      inv({ id: 3, dueDate: '2026-06-20', status: 'void' }),                        // void
      inv({ id: 4, dueDate: '2026-06-20', total: 50, paidAmount: 50 }),             // 0 outstanding
    ], asOf);
    expect(res.totalOutstanding).toBe(70);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].outstanding).toBe(70);
    expect(res.rows[0].bucket).toBe('d1_30');
  });

  it('sorts most-overdue first', () => {
    const res = computeAging([
      inv({ id: 1, invoiceNumber: 'recent', dueDate: '2026-06-25' }),
      inv({ id: 2, invoiceNumber: 'old', dueDate: '2026-01-01' }),
    ], asOf);
    expect(res.rows[0].invoiceNumber).toBe('old');
  });

  it('coerces Decimal-like strings and handles empty input', () => {
    const paid = computeAging([inv({ id: 1, dueDate: '2026-06-20', total: '100.50' as any, paidAmount: '0.50' as any })], asOf);
    expect(paid.totalOutstanding).toBe(100);

    const empty = computeAging([], asOf);
    expect(empty.totalOutstanding).toBe(0);
    expect(empty.rows).toHaveLength(0);
    expect(empty.buckets.current).toBe(0);
  });
});
