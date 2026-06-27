CREATE TABLE "bank_accounts" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "bank_name" VARCHAR(255) NOT NULL,
  "account_number" VARCHAR(100),
  "account_type" VARCHAR(50) NOT NULL DEFAULT 'checking',
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "bank_accounts_tenant_id_idx" ON "bank_accounts"("tenant_id");

CREATE TABLE "bank_transactions" (
  "id" SERIAL PRIMARY KEY,
  "bank_account_id" INTEGER NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" VARCHAR(500) NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "type" VARCHAR(10) NOT NULL DEFAULT 'credit',
  "reference" VARCHAR(255),
  "reconciled" BOOLEAN NOT NULL DEFAULT false,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "bank_transactions_tenant_id_idx" ON "bank_transactions"("tenant_id");
CREATE INDEX "bank_transactions_bank_account_id_idx" ON "bank_transactions"("bank_account_id");
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
