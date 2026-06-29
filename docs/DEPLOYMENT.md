# Deployment & Hardening Runbook (Supabase + Vercel)

This covers the steps that require live Supabase/Vercel access and therefore can't be
done from the codebase alone. Code-side changes (pool tuning, storage resolver, env
validation, RLS migration, encryption) ship with the app; the actions below wire them
to your real infrastructure. Do them on a **Supabase branch / staging project first**.

## 0. URGENT — rotate the leaked DB credential
A real-looking password was previously committed in `.env.example`. Treat it as
compromised:
1. Supabase → **Project Settings → Database → Reset database password**.
2. Update `DATABASE_URL` and `DIRECT_URL` everywhere (local `.env`, Vercel env).
3. Never paste real secrets into `.env.example` again (placeholders only).

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)
Set for **Production** and **Preview** separately:
- `DATABASE_URL` — pooled, port **6543**, `?pgbouncer=true&sslmode=require`
- `DIRECT_URL` — direct, port **5432**, `?sslmode=require`
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` — the deployment URL
- `ENCRYPTION_KEY` — `openssl rand -base64 32` (Phase E; **never rotate without re-encrypting** existing rows)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
- `CRON_SECRET` — `openssl rand -base64 32` (Phase F)
- Provider keys as needed: `RESEND_API_KEY`, `EMAIL_FROM`, `MERCADOPAGO_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`
- Optional: `DATABASE_CA_CERT` (PEM) to enable strict TLS verification, `DATABASE_POOL_MAX`

## 2. Migrations
The Prisma CLI uses `DIRECT_URL` (see `prisma.config.ts`). Replace the old ad-hoc
`prisma db execute` scripts with the tracked migration workflow:
```bash
# One-time: baseline the already-applied schema so history is consistent
npx prisma migrate resolve --applied <existing_migration_name>
# Going forward (CI/release step):
npx prisma migrate deploy
```
Add `prisma migrate deploy` as a release step (not the Vercel build — keep schema
changes out of the build to avoid partial deploys).

## 3. Dedicated, non-superuser app role (required for RLS — Phase C)
Supabase's default `postgres` user **bypasses RLS**. Create a restricted role and point
`DATABASE_URL`/`DIRECT_URL` at it; keep `postgres`/service-role for migrations only.
```sql
create role app_user with login password '<strong-password>';
grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public grant usage, select on sequences to app_user;
-- app_user must NOT have BYPASSRLS and must NOT own the tables.
```
Verify on a branch DB before switching production over (highest-blast-radius step).

### Enabling RLS (do these together, on a branch first)
RLS is inert until the app connects as a non-BYPASSRLS role AND the GUC is set, so the
policies can land early. To turn it on:
1. Apply the policies: `npx prisma migrate deploy` (includes `enable_rls`).
2. Switch `DATABASE_URL`/`DIRECT_URL` to `app_user` (step 3 above).
3. Set `RLS_ENABLED=true` so the app binds `app.tenant_id` per request/transaction.
4. Verify: as `app_user`, `SET app.tenant_id='1'` then a `SELECT` only returns tenant 1;
   with no GUC set, queries return zero rows (fail-closed).

The app sets the GUC transaction-locally (`set_config(..., true)`), required under the
transaction pooler. To roll back, set `RLS_ENABLED=false` and/or point back at the
privileged role.

**Prerequisite — route audit (C4, not yet complete).** The GUC is only set on the
request-scoped client (`ctx.db`) and the posting transactions. ~52 route files still
query the *global* `prisma` client (`prisma as any`); with RLS on, those queries have no
GUC and return **zero rows** (fail-closed). Before flipping `RLS_ENABLED=true`:
- Convert tenant-scoped routes from `(prisma as any)` to `ctx.db` so they pick up the GUC.
- Leave deliberately cross-tenant super-admin routes (`core/overview`, `core/tenants`,
  `core/roles`, platform dashboards) on the global client, or have them set the GUC to the
  specific tenant they target — do NOT force them through a single-tenant client.
- Verify every screen on a branch DB with `RLS_ENABLED=true` before production.
This audit is mechanical but per-route; until it's done, keep `RLS_ENABLED=false` (the
app-layer tenant filter remains the active isolation, exactly as today).

## 4. Storage bucket
Supabase → **Storage → Create bucket** named to match `SUPABASE_STORAGE_BUCKET`
(default `attachments`), **Private** (no public access). The app reads/writes via the
service-role key and serves files through authenticated routes / short-lived signed URLs.

## 4b. Field encryption
The app encrypts sensitive fields (AES-256-GCM) on top of Supabase's at-rest encryption.
1. Set `ENCRYPTION_KEY` (`openssl rand -base64 32`) in every environment. It's **required
   in production** — the app refuses to start without it (so secrets can't silently land
   as plaintext). Treat it like a root secret; rotating it requires re-encrypting rows.
2. Encrypt any pre-existing rows once: `node prisma/scripts/encrypt-existing.js`
   (idempotent). Currently covers `bank_accounts.account_number` and secret
   `tenant_configs` values — the fields the app round-trips today.
- Follow-up: extend the same `encryptField`/`decryptField` boundary to
  `vendors.tax_id`/`bank_details` and `customers.tax_id` (and add them to the backfill)
  when those routes are wired — encryption is graceful (plaintext passes through), so it
  can roll out per-field without a flag day.

## 5. Backups & visibility
- Enable **PITR** (or at least daily backups): Supabase → Database → Backups.
- Run **Security Advisor** and **Performance Advisor**; capture the baseline and fix
  flagged items (especially "RLS disabled on public table" once Phase C lands).

## 6. Post-deploy smoke
- App boots with no prepared-statement errors under load (transaction pooler).
- Cross-tenant check: a user from tenant A cannot read tenant B data (RLS).
- Upload → stored in the private bucket; download works via the authenticated route.
- A failed posting rolls back atomically (no partial GL/stock rows).
