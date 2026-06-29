-- Phase B: financial data integrity
-- Idempotent (CREATE ... IF NOT EXISTS) so it is safe to re-run.

-- Collision-safe per-tenant document numbering counter.
CREATE TABLE IF NOT EXISTS document_counters (
  tenant_id INTEGER NOT NULL,
  doc_type  VARCHAR(50) NOT NULL,
  value     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT document_counters_pkey PRIMARY KEY (tenant_id, doc_type)
);

-- Visible record of postings that no-opped (missing GL accounts, no bank account, …).
CREATE TABLE IF NOT EXISTS posting_exceptions (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER NOT NULL,
  source     VARCHAR(100) NOT NULL,
  reference  VARCHAR(255),
  reason     TEXT NOT NULL,
  resolved   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posting_exceptions_tenant_resolved_idx
  ON posting_exceptions (tenant_id, resolved);

-- Optional one-time backfill so counters continue past pre-existing documents.
-- (Safe to run repeatedly; ON CONFLICT keeps the higher value.)
INSERT INTO document_counters (tenant_id, doc_type, value)
SELECT tenant_id, 'JE', COUNT(*) FROM journal_entries GROUP BY tenant_id
ON CONFLICT (tenant_id, doc_type) DO UPDATE SET value = GREATEST(document_counters.value, EXCLUDED.value);

INSERT INTO document_counters (tenant_id, doc_type, value)
SELECT tenant_id, 'INV', COUNT(*) FROM ar_invoices GROUP BY tenant_id
ON CONFLICT (tenant_id, doc_type) DO UPDATE SET value = GREATEST(document_counters.value, EXCLUDED.value);

INSERT INTO document_counters (tenant_id, doc_type, value)
SELECT tenant_id, 'SO', COUNT(*) FROM sales_orders GROUP BY tenant_id
ON CONFLICT (tenant_id, doc_type) DO UPDATE SET value = GREATEST(document_counters.value, EXCLUDED.value);
