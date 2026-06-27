-- CreateTable: payroll_runs
CREATE TABLE "payroll_runs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "total_gross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payroll_entries
CREATE TABLE "payroll_entries" (
    "id" SERIAL NOT NULL,
    "payroll_run_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "base_salary" DECIMAL(15,2) NOT NULL,
    "bonuses" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_tenant_id_period_key" ON "payroll_runs"("tenant_id", "period");

-- CreateIndex
CREATE INDEX "payroll_runs_tenant_id_status_idx" ON "payroll_runs"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_payroll_run_id_user_id_key" ON "payroll_entries"("payroll_run_id", "user_id");

-- CreateIndex
CREATE INDEX "payroll_entries_payroll_run_id_idx" ON "payroll_entries"("payroll_run_id");

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_payroll_run_id_fkey"
    FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
