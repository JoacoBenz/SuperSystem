// Bank-statement (CSV) parsing + reconciliation classification. Dependency-free and
// pure, so it's fully unit-testable without a database. The default bank-feed format;
// other formats (OFX/MT940) can implement the same StatementRow shape later.

export interface StatementRow {
  date: string;
  description: string;
  amount: number; // signed: credit positive, debit negative
  reference: string;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseAmount(s: string | undefined): number {
  if (!s) return 0;
  let t = s.trim().replace(/[$€£\s]/g, '');
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); } // (123.45) = negative
  t = t.replace(/,/g, ''); // treat commas as thousands separators
  const n = parseFloat(t);
  if (Number.isNaN(n)) return 0;
  return neg ? -n : n;
}

/** Parse a CSV statement. Detects a single signed `amount` column, or separate `credit`/`debit` columns. */
export function parseStatementCsv(text: string): StatementRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex(h => names.includes(h));
  const di = idx(['date', 'fecha']);
  const desci = idx(['description', 'desc', 'memo', 'detail', 'concepto', 'descripcion']);
  const ai = idx(['amount', 'monto', 'importe', 'value']);
  const crediti = idx(['credit', 'credito', 'crédito']);
  const debiti = idx(['debit', 'debito', 'débito']);
  const ri = idx(['reference', 'ref', 'id', 'referencia']);

  const rows: StatementRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    let amount = 0;
    if (ai >= 0) amount = parseAmount(cols[ai]);
    else if (crediti >= 0 || debiti >= 0) amount = parseAmount(cols[crediti]) - parseAmount(cols[debiti]);
    rows.push({
      date: di >= 0 ? (cols[di] ?? '').trim() : '',
      description: desci >= 0 ? (cols[desci] ?? '').trim() : '',
      amount,
      reference: ri >= 0 ? (cols[ri] ?? '').trim() : '',
    });
  }
  return rows;
}

export interface ClassifiedStatement {
  toReconcile: StatementRow[]; // reference matches an existing un-reconciled transaction
  toCreate: StatementRow[];    // new lines to post
  duplicates: StatementRow[];  // reference already present and reconciled
}

/** Split parsed rows by what to do, given the existing transactions keyed by reference. */
export function classifyStatement(rows: StatementRow[], existing: Map<string, { reconciled: boolean }>): ClassifiedStatement {
  const toReconcile: StatementRow[] = [];
  const toCreate: StatementRow[] = [];
  const duplicates: StatementRow[] = [];
  for (const r of rows) {
    const ex = r.reference ? existing.get(r.reference) : undefined;
    if (ex) (ex.reconciled ? duplicates : toReconcile).push(r);
    else toCreate.push(r);
  }
  return { toReconcile, toCreate, duplicates };
}
