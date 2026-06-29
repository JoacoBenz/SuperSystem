-- Phase D: durable, cross-instance rate limiting / account lockout.
-- The previous limiter was in-memory and reset per serverless invocation (a no-op on
-- Vercel). This table is the shared store. No tenant_id -> intentionally exempt from RLS.
-- Idempotent.

CREATE TABLE IF NOT EXISTS rate_limits (
  key      VARCHAR(255) PRIMARY KEY,
  count    INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);
