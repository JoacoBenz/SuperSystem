-- Budget planning module. Tables named budget_plans / budget_plan_items to avoid
-- collision with the existing finance "budgets" table (model Budget).
CREATE TABLE "budget_plans" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "period" VARCHAR(20) NOT NULL DEFAULT 'annual',
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "department" VARCHAR(100),
  "description" TEXT,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "budget_plans_tenant_id_idx" ON "budget_plans"("tenant_id");
CREATE INDEX "budget_plans_tenant_id_fiscal_year_idx" ON "budget_plans"("tenant_id", "fiscal_year");

CREATE TABLE "budget_plan_items" (
  "id" SERIAL PRIMARY KEY,
  "budget_id" INTEGER NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "planned_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "actual_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "budget_plan_items_budget_id_idx" ON "budget_plan_items"("budget_id");
CREATE INDEX "budget_plan_items_tenant_id_idx" ON "budget_plan_items"("tenant_id");
ALTER TABLE "budget_plan_items" ADD CONSTRAINT "budget_plan_items_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
