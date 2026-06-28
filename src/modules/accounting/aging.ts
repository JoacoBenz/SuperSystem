// Pure AR/AP aging aggregation. Buckets outstanding invoices by how far past due
// they are, relative to a caller-supplied `asOf` date (kept as a parameter so the
// logic is deterministic and unit-testable without the system clock).

export interface AgingInvoice {
  id: number;
  invoiceNumber: string;
  partner: string;
  dueDate: string | Date;
  total: number | string | null;
  paidAmount: number | string | null;
  status: string;
}

export interface AgingRow extends AgingInvoice {
  outstanding: number;
  daysOverdue: number;
  bucket: BucketKey;
}

export type BucketKey = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90plus';

const SETTLED = new Set(['paid', 'void', 'cancelled']);
const DAY_MS = 24 * 60 * 60 * 1000;

function bucketFor(daysOverdue: number): BucketKey {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'd1_30';
  if (daysOverdue <= 60) return 'd31_60';
  if (daysOverdue <= 90) return 'd61_90';
  return 'd90plus';
}

export function computeAging(invoices: AgingInvoice[], asOf: Date) {
  const num = (v: unknown) => Number(v ?? 0);
  const buckets: Record<BucketKey, number> = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const rows: AgingRow[] = [];

  for (const inv of invoices) {
    if (SETTLED.has(inv.status)) continue;
    const outstanding = num(inv.total) - num(inv.paidAmount);
    if (outstanding <= 0.0001) continue;
    const due = new Date(inv.dueDate).getTime();
    const daysOverdue = Math.floor((asOf.getTime() - due) / DAY_MS);
    const bucket = bucketFor(daysOverdue);
    buckets[bucket] += outstanding;
    rows.push({ ...inv, outstanding, daysOverdue, bucket });
  }

  const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);
  // Sort most-overdue first so the worst exposure surfaces at the top.
  rows.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { buckets, totalOutstanding, rows };
}
