-- Phase F: durable job outbox (background work off the request path). Idempotent.
-- No tenant_id -> intentionally exempt from RLS (the cron drainer is cross-tenant).

CREATE TABLE IF NOT EXISTS job_outbox (
  id           SERIAL PRIMARY KEY,
  kind         VARCHAR(50) NOT NULL,
  payload      JSONB NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts     INTEGER NOT NULL DEFAULT 0,
  run_after    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS job_outbox_status_run_after_idx ON job_outbox (status, run_after);
