import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const SALES_PERMISSIONS = [
  { resource: 'customer', action: 'read', description: 'View customers' },
  { resource: 'customer', action: 'manage', description: 'Create and manage customers' },
  { resource: 'order', action: 'read', description: 'View sales orders' },
  { resource: 'order', action: 'manage', description: 'Create and manage sales orders' },
  { resource: 'dashboard', action: 'read', description: 'View sales dashboard' },
];

const SALES_ROLES = [
  { name: 'sales.admin', displayName: 'Sales Administrator', permissions: ['sales.customer.read', 'sales.customer.manage', 'sales.order.read', 'sales.order.manage', 'sales.dashboard.read'] },
  { name: 'sales.rep', displayName: 'Sales Representative', permissions: ['sales.customer.read', 'sales.order.read', 'sales.order.manage', 'sales.dashboard.read'] },
  { name: 'sales.viewer', displayName: 'Sales Viewer', permissions: ['sales.customer.read', 'sales.order.read', 'sales.dashboard.read'] },
];

const SEED_CUSTOMERS = [
  { name: 'Global Tech Solutions', email: 'orders@globaltech.com', phone: '+1 555 100 2000', taxId: 'US123456789' },
  { name: 'Metro Retail Group', email: 'procurement@metroretail.com', phone: '+1 555 200 3000', taxId: 'US987654321' },
  { name: 'Summit Enterprises', email: 'billing@summit.com', phone: '+1 555 300 4000' },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up Sales for ${tenants.length} tenant(s)...`);

  const permMap = new Map<string, number>();
  for (const p of SALES_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'sales', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'sales', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`sales.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: sales.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'sales' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'sales', enabled: true },
    });

    for (const roleDef of SALES_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, isSystem: true, moduleId: 'sales' },
        create: { tenantId: tenant.id, name: roleDef.name, displayName: roleDef.displayName, description: roleDef.displayName, isSystem: true, moduleId: 'sales' },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (permId) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
      }
      console.log(`  Role: ${roleDef.name}`);
    }

    const adminUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, orgRole: 'admin' } });
    const salesAdminRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'sales.admin' } });
    if (salesAdminRole) {
      for (const u of adminUsers) {
        const existing = await prisma.userRole.findFirst({ where: { userId: u.id, roleId: salesAdminRole.id } });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: salesAdminRole.id } });
          console.log(`  Granted sales.admin to ${u.email}`);
        }
      }
    }

    // Seed test customers
    const adminUser = adminUsers[0];
    if (adminUser) {
      for (const c of SEED_CUSTOMERS) {
        const existing = await (prisma as any).customer.findFirst({ where: { tenantId: tenant.id, name: c.name } });
        if (!existing) {
          await (prisma as any).customer.create({
            data: { ...c, tenantId: tenant.id, active: true, createdBy: adminUser.id },
          });
          console.log(`  Customer: ${c.name}`);
        }
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
