/**
 * One-time setup: enable HR module for existing tenants.
 * Run with: npx tsx prisma/setup-hr.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const HR_PERMISSIONS = [
  { resource: 'employee', action: 'read', description: 'View employee directory' },
  { resource: 'employee', action: 'manage', description: 'Manage employee profiles' },
  { resource: 'dashboard', action: 'read', description: 'View HR dashboard' },
];

const HR_ROLES = [
  { name: 'hr.admin', displayName: 'HR Administrator', permissions: ['hr.employee.read', 'hr.employee.manage', 'hr.dashboard.read'] },
  { name: 'hr.manager', displayName: 'HR Manager', permissions: ['hr.employee.read', 'hr.dashboard.read'] },
  { name: 'hr.employee', displayName: 'Employee', permissions: ['hr.employee.read'] },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up HR for ${tenants.length} tenant(s)...`);

  // 1. Upsert permissions (global)
  const permMap = new Map<string, number>();
  for (const p of HR_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'hr', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'hr', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`hr.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: hr.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    // 2. Enable HR module
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'hr' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'hr', enabled: true },
    });
    console.log(`  HR module enabled`);

    // 3. Create roles + assign permissions
    for (const roleDef of HR_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, isSystem: true, moduleId: 'hr' },
        create: { tenantId: tenant.id, name: roleDef.name, displayName: roleDef.displayName, description: roleDef.displayName, isSystem: true, moduleId: 'hr' },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (permId) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
      }
      console.log(`  Role: ${roleDef.name} (${roleDef.permissions.length} perms)`);
    }

    // 4. Grant hr.admin to admin users
    const adminUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, orgRole: 'admin' } });
    const hrAdminRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'hr.admin' } });
    if (hrAdminRole) {
      for (const u of adminUsers) {
        const existing = await prisma.userRole.findFirst({ where: { userId: u.id, roleId: hrAdminRole.id } });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: hrAdminRole.id } });
          console.log(`  Granted hr.admin to ${u.email}`);
        } else {
          console.log(`  ${u.email} already has hr.admin`);
        }
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
