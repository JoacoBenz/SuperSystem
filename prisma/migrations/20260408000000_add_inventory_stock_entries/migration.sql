-- CreateTable: inventory stock entries
-- This table records goods received from procurement receptions into inventory.
-- Each row corresponds to one line item from a Reception.

CREATE TABLE "stock_entries" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "reception_id" INTEGER NOT NULL,
    "purchase_request_item_id" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'units',
    "unit_cost" DECIMAL(15,2),
    "vendor_id" INTEGER,
    "conforming" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_entries_tenant_id_reception_id_idx" ON "stock_entries"("tenant_id", "reception_id");

-- CreateIndex
CREATE INDEX "stock_entries_tenant_id_purchase_request_item_id_idx" ON "stock_entries"("tenant_id", "purchase_request_item_id");
