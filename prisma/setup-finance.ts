/**
 * One-time script to enable the finance module for existing tenants.
 * Run with: npx tsx prisma/setup-finance.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

const FINANCE_PERMISSIONS = [
  { resource: 'budget', action: 'read', description: 'View budgets' },
  { resource: 'budget', action: 'manage', description: 'Manage budgets' },
  { resource: 'payment', action: 'read', description: 'View payment queue' },
  { resource: 'payment', action: 'schedule', description: 'Schedule payments' },
  { resource: 'report', action: 'read', description: 'View finance reports' },
];

const FINANCE_ROLES = [
  {
    name: 'treasurer',
    displayName: 'Treasurer',
    permissions: [
      'finance.budget.read',
      'finance.budget.manage',
      'finance.payment.read',
      'finance.payment.schedule',
      'finance.report.read',
    ],
  },
  {
    name: 'finance_viewer',
    displayName: 'Finance Viewer',
    permissions: [
      'finance.budget.read',
      'finance.payment.read',
      'finance.report.read',
    ],
  },
];

async function createTablesIfMissing() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "budgets" (
      "id" SERIAL NOT NULL,
      "tenant_id" INTEGER NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "cost_center_id" INTEGER,
      "department_id" INTEGER,
      "fiscal_year" INTEGER NOT NULL,
      "amount" DECIMAL(15,2) NOT NULL,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
      "notes" TEXT,
      "created_by" INTEGER NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "budgets_tenant_id_cost_center_id_fiscal_year_key"
    ON "budgets"("tenant_id", "cost_center_id", "fiscal_year");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "budgets_tenant_id_fiscal_year_idx"
    ON "budgets"("tenant_id", "fiscal_year");
  `);
  console.log('  budgets table ready');
}

async function main() {
  console.log('Creating finance tables if missing...');
  await createTablesIfMissing();

  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up finance for ${tenants.length} tenant(s)...`);

  // 1. Upsert permissions (global, not per-tenant)
  const permMap = new Map<string, number>();
  for (const p of FINANCE_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'finance', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'finance', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`finance.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: finance.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    // 2. Enable finance module
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'finance' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'finance', enabled: true },
    });
    console.log(`  Finance module enabled`);

    // 3. Create roles + permissions
    for (const roleDef of FINANCE_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, description: roleDef.displayName, isSystem: true, moduleId: 'finance' },
        create: {
          tenantId: tenant.id,
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.displayName,
          isSystem: true,
          moduleId: 'finance',
        },
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (permId) {
          await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
        }
      }
      console.log(`  Role: ${roleDef.name} (${roleDef.permissions.length} permissions)`);
    }

    // 4. Grant treasurer role to users with name containing 'Treasurer' OR email 'laura@demo.com'
    const targetUsers = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { name: { contains: 'Treasurer', mode: 'insensitive' } },
          { email: 'laura@demo.com' },
        ],
      },
    });
    const treasurerRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: 'treasurer' },
    });
    if (treasurerRole) {
      for (const u of targetUsers) {
        const existing = await prisma.userRole.findFirst({
          where: { userId: u.id, roleId: treasurerRole.id },
        });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: treasurerRole.id } });
          console.log(`  Granted treasurer to ${u.email}`);
        } else {
          console.log(`  ${u.email} already has treasurer`);
        }
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
