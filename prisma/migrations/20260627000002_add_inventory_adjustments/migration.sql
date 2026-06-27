-- CreateTable: inventory stock adjustments
-- Manual quantity corrections applied outside of the procurement reception flow.

CREATE TABLE "stock_adjustments" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'units',
    "reason" VARCHAR(500) NOT NULL,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustments_tenant_id_idx" ON "stock_adjustments"("tenant_id");
