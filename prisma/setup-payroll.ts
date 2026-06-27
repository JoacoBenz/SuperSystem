import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const PAYROLL_PERMISSIONS = [
  { resource: 'run', action: 'read', description: 'View payroll runs and entries' },
  { resource: 'run', action: 'manage', description: 'Create and manage payroll runs' },
  { resource: 'run', action: 'approve', description: 'Approve and mark payroll as paid' },
  { resource: 'dashboard', action: 'read', description: 'View payroll dashboard' },
];

const PAYROLL_ROLES = [
  { name: 'payroll.admin', displayName: 'Payroll Administrator', permissions: ['payroll.run.read', 'payroll.run.manage', 'payroll.run.approve', 'payroll.dashboard.read'] },
  { name: 'payroll.manager', displayName: 'Payroll Manager', permissions: ['payroll.run.read', 'payroll.run.manage', 'payroll.dashboard.read'] },
  { name: 'payroll.viewer', displayName: 'Payroll Viewer', permissions: ['payroll.run.read', 'payroll.dashboard.read'] },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up Payroll for ${tenants.length} tenant(s)...`);

  const permMap = new Map<string, number>();
  for (const p of PAYROLL_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'payroll', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'payroll', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`payroll.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: payroll.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'payroll' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'payroll', enabled: true },
    });
    console.log(`  Payroll module enabled`);

    for (const roleDef of PAYROLL_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, isSystem: true, moduleId: 'payroll' },
        create: { tenantId: tenant.id, name: roleDef.name, displayName: roleDef.displayName, description: roleDef.displayName, isSystem: true, moduleId: 'payroll' },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (permId) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
      }
      console.log(`  Role: ${roleDef.name} (${roleDef.permissions.length} perms)`);
    }

    const adminUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, orgRole: 'admin' } });
    const payrollAdminRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'payroll.admin' } });
    if (payrollAdminRole) {
      for (const u of adminUsers) {
        const existing = await prisma.userRole.findFirst({ where: { userId: u.id, roleId: payrollAdminRole.id } });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: payrollAdminRole.id } });
          console.log(`  Granted payroll.admin to ${u.email}`);
        } else {
          console.log(`  ${u.email} already has payroll.admin`);
        }
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
