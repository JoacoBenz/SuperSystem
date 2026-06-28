import { describe, it, expect } from 'vitest';
import { computeStatements } from '../statements';

describe('computeStatements — income statement', () => {
  it('computes revenue − COGS − opex = net income', () => {
    const accts = [
      { code: '4000', name: 'Revenue', type: 'revenue', balance: 1000 },
      { code: '5100', name: 'Cost of Goods Sold', type: 'expense', balance: 300 },
      { code: '5000', name: 'Operating Expenses', type: 'expense', balance: 200 },
    ];
    const s = computeStatements(accts, [], []);
    expect(s.incomeStatement.totalRevenue).toBe(1000);
    expect(s.incomeStatement.totalCogs).toBe(300);
    expect(s.incomeStatement.grossProfit).toBe(700);
    expect(s.incomeStatement.totalOperatingExpenses).toBe(200);
    expect(s.incomeStatement.netIncome).toBe(500);
  });

  it('isolates COGS by code 51* or name match', () => {
    const accts = [
      { code: '5100', name: 'COGS', type: 'expense', balance: 100 },
      { code: '5200', name: 'Cost of Goods Sold — freight', type: 'expense', balance: 50 },
      { code: '5000', name: 'Rent', type: 'expense', balance: 30 },
    ];
    const s = computeStatements(accts, [], []);
    expect(s.incomeStatement.totalCogs).toBe(150);
    expect(s.incomeStatement.totalOperatingExpenses).toBe(30);
  });
});

describe('computeStatements — balance sheet', () => {
  it('balances when the ledger is double-entry consistent', () => {
    const accts = [
      { code: '1000', name: 'Cash', type: 'asset', balance: 1000 },
      { code: '2000', name: 'Accounts Payable', type: 'liability', balance: 300 },
      { code: '3000', name: 'Equity', type: 'equity', balance: 500 },
      { code: '4000', name: 'Revenue', type: 'revenue', balance: 400 },
      { code: '5000', name: 'Expenses', type: 'expense', balance: 200 },
    ];
    // net income 200 → equity 500+200=700 → L+E 300+700=1000 = assets 1000
    const s = computeStatements(accts, [], []);
    expect(s.balanceSheet.totalAssets).toBe(1000);
    expect(s.balanceSheet.currentEarnings).toBe(200);
    expect(s.balanceSheet.totalEquity).toBe(700);
    expect(s.balanceSheet.totalLiabilitiesAndEquity).toBe(1000);
    expect(s.balanceSheet.balanced).toBe(true);
    expect(s.balanceSheet.difference).toBe(0);
  });

  it('flags an out-of-balance sheet with the difference', () => {
    const accts = [{ code: '1000', name: 'Cash', type: 'asset', balance: 100 }];
    const s = computeStatements(accts, [], []);
    expect(s.balanceSheet.balanced).toBe(false);
    expect(s.balanceSheet.difference).toBe(100);
  });
});

describe('computeStatements — cash flow & edges', () => {
  it('summarises cash flow from treasury transactions', () => {
    const s = computeStatements([], [{ balance: 500 }], [
      { amount: 200, type: 'credit' },
      { amount: 50, type: 'debit' },
    ]);
    expect(s.cashFlow.cashInflows).toBe(200);
    expect(s.cashFlow.cashOutflows).toBe(50);
    expect(s.cashFlow.netCashFlow).toBe(150);
    expect(s.cashFlow.endingCash).toBe(500);
    expect(s.cashFlow.beginningCash).toBe(350);
  });

  it('handles empty data', () => {
    const s = computeStatements([], [], []);
    expect(s.incomeStatement.netIncome).toBe(0);
    expect(s.balanceSheet.totalAssets).toBe(0);
    expect(s.balanceSheet.balanced).toBe(true);
    expect(s.cashFlow.endingCash).toBe(0);
  });

  it('coerces Prisma Decimal-like string balances to numbers', () => {
    const s = computeStatements(
      [{ code: '4000', name: 'Revenue', type: 'revenue', balance: '250.50' }],
      [{ balance: '100.25' }],
      [],
    );
    expect(s.incomeStatement.totalRevenue).toBe(250.5);
    expect(s.cashFlow.endingCash).toBe(100.25);
  });
});
