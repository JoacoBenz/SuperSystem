import { describe, it, expect } from 'vitest';
import { parseStatementCsv, classifyStatement, type StatementRow } from '../csv';

describe('parseStatementCsv', () => {
  it('parses header + signed amount + reference', () => {
    const rows = parseStatementCsv('date,description,amount,reference\n2026-06-01,Client payment,500.00,INV-1\n2026-06-02,Supplier,-200,BILL-1');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ description: 'Client payment', amount: 500, reference: 'INV-1' });
    expect(rows[1].amount).toBe(-200);
  });

  it('derives signed amount from separate credit/debit columns', () => {
    const rows = parseStatementCsv('Date,Memo,Credit,Debit,Ref\n2026-06-01,In,500,,A\n2026-06-02,Out,,200,B');
    expect(rows[0].amount).toBe(500);
    expect(rows[1].amount).toBe(-200);
    expect(rows[0].reference).toBe('A');
  });

  it('handles quoted fields with commas + currency symbols + parens', () => {
    const rows = parseStatementCsv('amount,description,reference\n"$1,250.50","Big, payment",R1\n(75.00),Refund,R2');
    expect(rows[0].amount).toBe(1250.5);
    expect(rows[0].description).toBe('Big, payment');
    expect(rows[1].amount).toBe(-75);
  });

  it('returns [] for empty / header-only input', () => {
    expect(parseStatementCsv('')).toEqual([]);
    expect(parseStatementCsv('date,amount,reference')).toEqual([]);
  });
});

describe('classifyStatement', () => {
  const rows: StatementRow[] = [
    { date: '', description: '', amount: 100, reference: 'A' },
    { date: '', description: '', amount: 50, reference: 'B' },
    { date: '', description: '', amount: 10, reference: 'C' },
    { date: '', description: '', amount: 5, reference: '' },
  ];
  it('splits into reconcile / duplicate / create by reference', () => {
    const existing = new Map([['A', { reconciled: false }], ['B', { reconciled: true }]]);
    const c = classifyStatement(rows, existing);
    expect(c.toReconcile.map(r => r.reference)).toEqual(['A']);
    expect(c.duplicates.map(r => r.reference)).toEqual(['B']);
    expect(c.toCreate.map(r => r.reference)).toEqual(['C', '']); // unknown ref + no-ref both new
  });
});
