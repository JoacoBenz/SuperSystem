-- Phase 2 (part 2): Business partner master + soft-links from Customer/Vendor/CrmCompany.

CREATE TABLE IF NOT EXISTS "business_partners" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tax_id" VARCHAR(100),
    "roles" VARCHAR(20) NOT NULL DEFAULT 'both',
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_partners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "business_partners_tenant_id_active_idx" ON "business_partners"("tenant_id", "active");
CREATE INDEX IF NOT EXISTS "business_partners_tenant_id_name_idx" ON "business_partners"("tenant_id", "name");

CREATE TABLE IF NOT EXISTS "business_partner_contacts" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "business_partner_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_partner_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "business_partner_contacts_business_partner_id_idx" ON "business_partner_contacts"("business_partner_id");

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "business_partner_id" INTEGER;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "business_partner_id" INTEGER;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "business_partner_id" INTEGER;

CREATE INDEX IF NOT EXISTS "customers_tenant_id_business_partner_id_idx" ON "customers"("tenant_id", "business_partner_id");
CREATE INDEX IF NOT EXISTS "vendors_tenant_id_business_partner_id_idx" ON "vendors"("tenant_id", "business_partner_id");
CREATE INDEX IF NOT EXISTS "crm_companies_tenant_id_business_partner_id_idx" ON "crm_companies"("tenant_id", "business_partner_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='business_partner_contacts_partner_fkey') THEN
    ALTER TABLE "business_partner_contacts" ADD CONSTRAINT "business_partner_contacts_partner_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customers_business_partner_id_fkey') THEN
    ALTER TABLE "customers" ADD CONSTRAINT "customers_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vendors_business_partner_id_fkey') THEN
    ALTER TABLE "vendors" ADD CONSTRAINT "vendors_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='crm_companies_business_partner_id_fkey') THEN
    ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
