// Dependency-free document generation: build print-ready HTML (with a Print / Save-as-PDF
// button) for invoices and financial statements. Pure functions — easily unit-tested.

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

const money = (v: number, c = 'USD') => `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
 body{font-family:system-ui,'Segoe UI',Arial,sans-serif;color:#1a1a1a;max-width:820px;margin:24px auto;padding:0 24px}
 h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 6px;color:#374151}
 table{width:100%;border-collapse:collapse;margin:12px 0}
 th,td{text-align:left;padding:8px;border-bottom:1px solid #e5e7eb}
 th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
 .r{text-align:right} .tot td{font-weight:700} .muted{color:#6b7280;font-size:13px}
 .bar{margin:12px 0}@media print{.bar{display:none}}
</style></head>
<body><div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>${body}</body></html>`;
}

export interface DocInvoice {
  kind: 'AR' | 'AP';
  invoiceNumber: string;
  partyLabel: string;
  partyName: string;
  issueDate: string | Date;
  dueDate: string | Date;
  currency: string;
  status: string;
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
}

export function renderInvoiceDocument(d: DocInvoice): string {
  const title = `${d.kind === 'AR' ? 'Invoice' : 'Bill'} ${d.invoiceNumber}`;
  const rows = d.items.map(i =>
    `<tr><td>${escapeHtml(i.description)}</td><td class="r">${i.quantity}</td><td class="r">${money(i.unitPrice, d.currency)}</td><td class="r">${money(i.lineTotal, d.currency)}</td></tr>`,
  ).join('');
  const body = `
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">${escapeHtml(d.partyLabel)}: <strong>${escapeHtml(d.partyName)}</strong> &middot; Status: ${escapeHtml(d.status.toUpperCase())}</div>
    <div class="muted">Issued ${escapeHtml(new Date(d.issueDate).toLocaleDateString())} &middot; Due ${escapeHtml(new Date(d.dueDate).toLocaleDateString())}</div>
    <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table style="max-width:320px;margin-left:auto"><tbody>
      <tr><td class="r">Subtotal</td><td class="r">${money(d.subtotal, d.currency)}</td></tr>
      <tr><td class="r">Tax</td><td class="r">${money(d.taxAmount, d.currency)}</td></tr>
      <tr class="tot"><td class="r">Total</td><td class="r">${money(d.total, d.currency)}</td></tr>
      <tr><td class="r">Paid</td><td class="r">${money(d.paidAmount, d.currency)}</td></tr>
      <tr class="tot"><td class="r">Balance Due</td><td class="r">${money(d.total - d.paidAmount, d.currency)}</td></tr>
    </tbody></table>`;
  return page(title, body);
}

export function renderStatementsDocument(s: any): string {
  const inc = s.incomeStatement, bs = s.balanceSheet, cf = s.cashFlow;
  const line = (label: string, val: number, bold = false) =>
    `<tr class="${bold ? 'tot' : ''}"><td>${escapeHtml(label)}</td><td class="r">${money(val)}</td></tr>`;
  const body = `
    <h1>Financial Statements</h1>
    <h2>Income Statement</h2><table><tbody>
      ${line('Revenue', inc.totalRevenue)}${line('Cost of Goods Sold', inc.totalCogs)}${line('Gross Profit', inc.grossProfit, true)}
      ${line('Operating Expenses', inc.totalOperatingExpenses)}${line('Net Income', inc.netIncome, true)}
    </tbody></table>
    <h2>Balance Sheet</h2><table><tbody>
      ${line('Total Assets', bs.totalAssets, true)}${line('Total Liabilities', bs.totalLiabilities)}${line('Total Equity', bs.totalEquity)}${line('Liabilities + Equity', bs.totalLiabilitiesAndEquity, true)}
      <tr><td>Balanced</td><td class="r">${bs.balanced ? 'Yes' : 'No (diff ' + money(bs.difference) + ')'}</td></tr>
    </tbody></table>
    <h2>Cash Flow</h2><table><tbody>
      ${line('Cash Inflows', cf.cashInflows)}${line('Cash Outflows', cf.cashOutflows)}${line('Net Cash Flow', cf.netCashFlow, true)}${line('Ending Cash', cf.endingCash, true)}
    </tbody></table>`;
  return page('Financial Statements', body);
}
