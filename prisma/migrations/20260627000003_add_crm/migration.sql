-- CreateTable: crm_companies
CREATE TABLE "crm_companies" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(100),
    "website" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: crm_contacts
CREATE TABLE "crm_contacts" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "title" VARCHAR(100),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: crm_opportunities
CREATE TABLE "crm_opportunities" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "contact_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "stage" VARCHAR(50) NOT NULL DEFAULT 'lead',
    "value" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expected_close_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "crm_companies_tenant_id_idx" ON "crm_companies"("tenant_id");
CREATE INDEX "crm_contacts_tenant_id_idx" ON "crm_contacts"("tenant_id");
CREATE INDEX "crm_contacts_tenant_id_company_id_idx" ON "crm_contacts"("tenant_id", "company_id");
CREATE INDEX "crm_opportunities_tenant_id_idx" ON "crm_opportunities"("tenant_id");
CREATE INDEX "crm_opportunities_tenant_id_stage_idx" ON "crm_opportunities"("tenant_id", "stage");

-- Foreign Keys
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
