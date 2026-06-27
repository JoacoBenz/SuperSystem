/**
 * One-time script to enable the inventory module for existing tenants.
 * Run with: npx tsx prisma/setup-inventory.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

const INVENTORY_PERMISSIONS = [
  { resource: 'stock_entry', action: 'read', description: 'View stock entries' },
  { resource: 'stock_entry', action: 'manage', description: 'Manage stock entries' },
  { resource: 'stock_adjustment', action: 'read', description: 'View stock adjustments' },
  { resource: 'stock_adjustment', action: 'create', description: 'Create stock adjustments' },
];

const INVENTORY_ROLES = [
  {
    name: 'inventory.warehouse_manager',
    displayName: 'Warehouse Manager',
    permissions: [
      'inventory.stock_entry.read',
      'inventory.stock_entry.manage',
      'inventory.stock_adjustment.read',
      'inventory.stock_adjustment.create',
    ],
  },
  {
    name: 'inventory.viewer',
    displayName: 'Inventory Viewer',
    permissions: [
      'inventory.stock_entry.read',
      'inventory.stock_adjustment.read',
    ],
  },
];

async function createTablesIfMissing() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "stock_entries" (
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
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "stock_entries_tenant_id_reception_id_idx"
    ON "stock_entries"("tenant_id", "reception_id");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "stock_entries_tenant_id_purchase_request_item_id_idx"
    ON "stock_entries"("tenant_id", "purchase_request_item_id");
  `);
  console.log('  stock_entries table ready');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "stock_adjustments" (
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
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "stock_adjustments_tenant_id_idx"
    ON "stock_adjustments"("tenant_id");
  `);
  console.log('  stock_adjustments table ready');
}

async function main() {
  console.log('Creating inventory tables if missing...');
  await createTablesIfMissing();

  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up inventory for ${tenants.length} tenant(s)...`);

  // 1. Upsert permissions (global, not per-tenant)
  const permMap = new Map<string, number>();
  for (const p of INVENTORY_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'inventory', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'inventory', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`inventory.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: inventory.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    // 2. Enable inventory module
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'inventory' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'inventory', enabled: true },
    });
    console.log(`  Inventory module enabled`);

    // 3. Create roles + permissions
    for (const roleDef of INVENTORY_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, description: roleDef.displayName, isSystem: true, moduleId: 'inventory' },
        create: {
          tenantId: tenant.id,
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.displayName,
          isSystem: true,
          moduleId: 'inventory',
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

    // 4. Grant warehouse_manager role to all admin users in this tenant
    const adminUsers = await prisma.user.findMany({
      where: { tenantId: tenant.id, orgRole: 'admin' },
    });
    const wmRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: 'inventory.warehouse_manager' },
    });
    if (wmRole) {
      for (const u of adminUsers) {
        const existing = await prisma.userRole.findFirst({
          where: { userId: u.id, roleId: wmRole.id },
        });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: wmRole.id } });
          console.log(`  Granted inventory.warehouse_manager to ${u.email}`);
        } else {
          console.log(`  ${u.email} already has inventory.warehouse_manager`);
        }
      }
    }
  }

  // 5. Backfill stock entries from existing receptions (for each tenant)
  console.log('\nBackfilling stock entries from existing receptions...');
  for (const tenant of tenants) {
    const receptions = await prisma.reception.findMany({
      where: { tenantId: tenant.id },
      include: {
        items: true,
        purchaseRequest: { include: { items: true } },
      },
    });

    let entriesCreated = 0;
    for (const reception of receptions) {
      for (const item of reception.items) {
        // Check if entry already exists
        const existing = await prisma.stockEntry.findFirst({
          where: { receptionId: reception.id, purchaseRequestItemId: item.purchaseRequestItemId },
        });
        if (existing) continue;

        const prItem = (reception.purchaseRequest as any).items?.find(
          (i: any) => i.id === item.purchaseRequestItemId
        );

        await prisma.stockEntry.create({
          data: {
            tenantId: tenant.id,
            receptionId: reception.id,
            purchaseRequestItemId: item.purchaseRequestItemId,
            description: prItem?.description ?? 'Unknown item',
            quantity: Number(item.quantityReceived),
            unit: prItem?.unit ?? 'units',
            unitCost: prItem?.estimatedPrice ? Number(prItem.estimatedPrice) : null,
            vendorId: (reception.purchaseRequest as any).vendorId ?? null,
            conforming: item.conforming,
            notes: item.notes ?? null,
            createdBy: reception.receiverId,
          } as any,
        });
        entriesCreated++;
      }
    }
    console.log(`  Tenant ${tenant.name}: created ${entriesCreated} stock entries from ${receptions.length} receptions`);
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
