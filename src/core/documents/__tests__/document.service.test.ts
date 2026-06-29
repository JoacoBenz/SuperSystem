import { describe, it, expect } from 'vitest';
import { renderInvoiceDocument, renderStatementsDocument, escapeHtml } from '../document.service';

describe('document.service', () => {
  it('renders an AR invoice with its key fields', () => {
    const html = renderInvoiceDocument({
      kind: 'AR', invoiceNumber: 'INV-9', partyLabel: 'Customer', partyName: 'Acme',
      issueDate: '2026-06-01', dueDate: '2026-07-01', currency: 'USD', status: 'issued',
      items: [{ description: 'Widget', quantity: 2, unitPrice: 50, lineTotal: 100 }],
      subtotal: 100, taxAmount: 0, total: 100, paidAmount: 0,
    });
    expect(html).toContain('Invoice INV-9');
    expect(html).toContain('Acme');
    expect(html).toContain('Widget');
    expect(html).toContain('USD 100.00');
    expect(html).toContain('Balance Due');
    expect(html).toContain('window.print()');
  });

  it('labels an AP bill as a Bill', () => {
    const html = renderInvoiceDocument({
      kind: 'AP', invoiceNumber: 'BILL-1', partyLabel: 'Vendor', partyName: 'V Co',
      issueDate: '2026-06-01', dueDate: '2026-07-01', currency: 'USD', status: 'approved',
      items: [], subtotal: 0, taxAmount: 0, total: 0, paidAmount: 0,
    });
    expect(html).toContain('Bill BILL-1');
    expect(html).toContain('V Co');
  });

  it('escapes HTML in fields (no injection)', () => {
    expect(escapeHtml('<b>&"x</b>')).toBe('&lt;b&gt;&amp;&quot;x&lt;/b&gt;');
    const html = renderInvoiceDocument({
      kind: 'AR', invoiceNumber: 'X', partyLabel: 'Customer', partyName: '<script>alert(1)</script>',
      issueDate: '2026-06-01', dueDate: '2026-07-01', currency: 'USD', status: 'issued',
      items: [], subtotal: 0, taxAmount: 0, total: 0, paidAmount: 0,
    });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders financial statements', () => {
    const html = renderStatementsDocument({
      incomeStatement: { totalRevenue: 1000, totalCogs: 300, grossProfit: 700, totalOperatingExpenses: 200, netIncome: 500 },
      balanceSheet: { totalAssets: 1000, totalLiabilities: 300, totalEquity: 700, totalLiabilitiesAndEquity: 1000, balanced: true, difference: 0 },
      cashFlow: { cashInflows: 200, cashOutflows: 50, netCashFlow: 150, endingCash: 500 },
    });
    expect(html).toContain('Net Income');
    expect(html).toContain('USD 500.00');
    expect(html).toContain('Balance Sheet');
  });
});
