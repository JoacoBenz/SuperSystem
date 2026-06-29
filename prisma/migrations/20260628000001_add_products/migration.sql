-- Phase 2: link line/stock models to the existing Product master (nullable, non-breaking).
-- The products + product_categories tables already exist; this only adds the links.
-- Idempotent so it can be applied against a database that already has some links.

ALTER TABLE "stock_entries" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;
ALTER TABLE "stock_adjustments" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;
ALTER TABLE "purchase_request_items" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;
ALTER TABLE "sales_order_items" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;
ALTER TABLE "ar_invoice_lines" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;
ALTER TABLE "ap_invoice_lines" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;

CREATE INDEX IF NOT EXISTS "stock_entries_tenant_id_product_id_idx" ON "stock_entries"("tenant_id", "product_id");
CREATE INDEX IF NOT EXISTS "stock_adjustments_tenant_id_product_id_idx" ON "stock_adjustments"("tenant_id", "product_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stock_entries_product_id_fkey') THEN
    ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stock_adjustments_product_id_fkey') THEN
    ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='purchase_request_items_product_id_fkey') THEN
    ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sales_order_items_product_id_fkey') THEN
    ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ar_invoice_lines_product_id_fkey') THEN
    ALTER TABLE "ar_invoice_lines" ADD CONSTRAINT "ar_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ap_invoice_lines_product_id_fkey') THEN
    ALTER TABLE "ap_invoice_lines" ADD CONSTRAINT "ap_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
