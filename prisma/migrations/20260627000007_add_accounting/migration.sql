CREATE TABLE "chart_of_accounts" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'asset',
  "parent_id" INTEGER,
  "description" TEXT,
  "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chart_of_accounts_tenant_code_key" UNIQUE ("tenant_id", "code")
);
CREATE INDEX "chart_of_accounts_tenant_id_idx" ON "chart_of_accounts"("tenant_id");
CREATE INDEX "chart_of_accounts_tenant_type_idx" ON "chart_of_accounts"("tenant_id", "type");

CREATE TABLE "journal_entries" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL,
  "entry_number" VARCHAR(50) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" VARCHAR(500) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "journal_entries_tenant_number_key" UNIQUE ("tenant_id", "entry_number")
);
CREATE INDEX "journal_entries_tenant_id_idx" ON "journal_entries"("tenant_id");
CREATE INDEX "journal_entries_tenant_status_idx" ON "journal_entries"("tenant_id", "status");

CREATE TABLE "journal_lines" (
  "id" SERIAL PRIMARY KEY,
  "journal_entry_id" INTEGER NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "account_id" INTEGER NOT NULL,
  "description" VARCHAR(500),
  "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey"
  FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
