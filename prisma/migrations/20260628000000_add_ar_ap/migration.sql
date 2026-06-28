-- Phase 1: Accounts Receivable / Accounts Payable (invoices + payments)

-- CreateTable: ar_invoices
CREATE TABLE "ar_invoices" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sales_order_id" INTEGER,
    "invoice_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ar_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ar_invoice_lines
CREATE TABLE "ar_invoice_lines" (
    "id" SERIAL NOT NULL,
    "ar_invoice_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ar_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ap_invoices
CREATE TABLE "ap_invoices" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "vendor_id" INTEGER,
    "purchase_request_id" INTEGER,
    "invoice_number" VARCHAR(50) NOT NULL,
    "vendor_invoice_number" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ap_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ap_invoice_lines
CREATE TABLE "ap_invoice_lines" (
    "id" SERIAL NOT NULL,
    "ap_invoice_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ap_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payments
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "kind" VARCHAR(2) NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" VARCHAR(30) NOT NULL DEFAULT 'bank',
    "reference" VARCHAR(100),
    "bank_transaction_id" INTEGER,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "ar_invoices_tenant_id_invoice_number_key" ON "ar_invoices"("tenant_id", "invoice_number");
CREATE INDEX "ar_invoices_tenant_id_status_idx" ON "ar_invoices"("tenant_id", "status");
CREATE INDEX "ar_invoices_tenant_id_customer_id_idx" ON "ar_invoices"("tenant_id", "customer_id");
CREATE INDEX "ar_invoices_tenant_id_due_date_idx" ON "ar_invoices"("tenant_id", "due_date");
CREATE INDEX "ar_invoice_lines_ar_invoice_id_idx" ON "ar_invoice_lines"("ar_invoice_id");

CREATE UNIQUE INDEX "ap_invoices_tenant_id_invoice_number_key" ON "ap_invoices"("tenant_id", "invoice_number");
CREATE INDEX "ap_invoices_tenant_id_status_idx" ON "ap_invoices"("tenant_id", "status");
CREATE INDEX "ap_invoices_tenant_id_vendor_id_idx" ON "ap_invoices"("tenant_id", "vendor_id");
CREATE INDEX "ap_invoices_tenant_id_due_date_idx" ON "ap_invoices"("tenant_id", "due_date");
CREATE INDEX "ap_invoice_lines_ap_invoice_id_idx" ON "ap_invoice_lines"("ap_invoice_id");

CREATE INDEX "payments_tenant_id_kind_invoice_id_idx" ON "payments"("tenant_id", "kind", "invoice_id");

-- Foreign Keys
ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ar_invoice_lines" ADD CONSTRAINT "ar_invoice_lines_ar_invoice_id_fkey"
    FOREIGN KEY ("ar_invoice_id") REFERENCES "ar_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ap_invoices" ADD CONSTRAINT "ap_invoices_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ap_invoice_lines" ADD CONSTRAINT "ap_invoice_lines_ap_invoice_id_fkey"
    FOREIGN KEY ("ap_invoice_id") REFERENCES "ap_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
