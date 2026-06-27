import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const CRM_PERMISSIONS = [
  { resource: 'contact', action: 'read', description: 'View CRM contacts' },
  { resource: 'contact', action: 'manage', description: 'Create and manage CRM contacts' },
  { resource: 'company', action: 'read', description: 'View CRM companies' },
  { resource: 'company', action: 'manage', description: 'Create and manage CRM companies' },
  { resource: 'opportunity', action: 'read', description: 'View CRM opportunities' },
  { resource: 'opportunity', action: 'manage', description: 'Create and manage CRM opportunities' },
  { resource: 'dashboard', action: 'read', description: 'View CRM dashboard' },
];

const CRM_ROLES = [
  {
    name: 'crm.admin',
    displayName: 'CRM Administrator',
    permissions: [
      'crm.contact.read',
      'crm.contact.manage',
      'crm.company.read',
      'crm.company.manage',
      'crm.opportunity.read',
      'crm.opportunity.manage',
      'crm.dashboard.read',
    ],
  },
  {
    name: 'crm.rep',
    displayName: 'CRM Representative',
    permissions: [
      'crm.contact.read',
      'crm.company.read',
      'crm.opportunity.read',
      'crm.opportunity.manage',
      'crm.dashboard.read',
    ],
  },
  {
    name: 'crm.viewer',
    displayName: 'CRM Viewer',
    permissions: [
      'crm.contact.read',
      'crm.company.read',
      'crm.opportunity.read',
      'crm.dashboard.read',
    ],
  },
];

const SEED_COMPANIES = [
  {
    name: 'Apex Technologies',
    industry: 'Technology',
    website: 'https://apex-tech.example.com',
    phone: '+1 555 100 2001',
  },
  {
    name: 'BrightWave Media',
    industry: 'Media & Entertainment',
    website: 'https://brightwave.example.com',
    phone: '+1 555 200 3002',
  },
  {
    name: 'Crestline Capital',
    industry: 'Finance',
    website: 'https://crestline.example.com',
    phone: '+1 555 300 4003',
  },
];

const SEED_CONTACTS = [
  {
    firstName: 'Sarah',
    lastName: 'Connors',
    email: 'sarah.connors@apex-tech.example.com',
    title: 'VP of Engineering',
    phone: '+1 555 100 2010',
    companyName: 'Apex Technologies',
  },
  {
    firstName: 'Marcus',
    lastName: 'Webb',
    email: 'marcus.webb@brightwave.example.com',
    title: 'Chief Marketing Officer',
    phone: '+1 555 200 3020',
    companyName: 'BrightWave Media',
  },
  {
    firstName: 'Diana',
    lastName: 'Huang',
    email: 'diana.huang@crestline.example.com',
    title: 'Director of Procurement',
    phone: '+1 555 300 4030',
    companyName: 'Crestline Capital',
  },
];

const SEED_OPPORTUNITIES = [
  {
    title: 'Apex Technologies — Enterprise SaaS License',
    stage: 'qualified',
    value: 120000,
    currency: 'USD',
    probability: 40,
    companyName: 'Apex Technologies',
    contactName: 'Sarah Connors',
  },
  {
    title: 'BrightWave — Marketing Platform Integration',
    stage: 'proposal',
    value: 45000,
    currency: 'USD',
    probability: 60,
    companyName: 'BrightWave Media',
    contactName: 'Marcus Webb',
  },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up CRM for ${tenants.length} tenant(s)...`);

  // Upsert permissions globally
  const permMap = new Map<string, number>();
  for (const p of CRM_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'crm', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'crm', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`crm.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: crm.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    // Enable module
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'crm' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'crm', enabled: true },
    });
    console.log('  Module enabled');

    // Upsert roles
    for (const roleDef of CRM_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, isSystem: true, moduleId: 'crm' },
        create: {
          tenantId: tenant.id,
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.displayName,
          isSystem: true,
          moduleId: 'crm',
        },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const permKey of roleDef.permissions) {
        const permId = permMap.get(permKey);
        if (permId) {
          await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
        }
      }
      console.log(`  Role: ${roleDef.name}`);
    }

    // Grant crm.admin to all admin users
    const adminUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, orgRole: 'admin' } });
    const crmAdminRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'crm.admin' } });
    if (crmAdminRole) {
      for (const u of adminUsers) {
        const existing = await prisma.userRole.findFirst({
          where: { userId: u.id, roleId: crmAdminRole.id },
        });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: crmAdminRole.id } });
          console.log(`  Granted crm.admin to ${u.email}`);
        }
      }
    }

    // Seed sample data
    const adminUser = adminUsers[0];
    if (!adminUser) continue;

    // Seed companies and build name→id map
    const companyIdMap = new Map<string, number>();
    for (const c of SEED_COMPANIES) {
      const existing = await (prisma as any).crmCompany.findFirst({
        where: { tenantId: tenant.id, name: c.name },
      });
      if (existing) {
        companyIdMap.set(c.name, existing.id);
        console.log(`  Company already exists: ${c.name}`);
      } else {
        const created = await (prisma as any).crmCompany.create({
          data: {
            tenantId: tenant.id,
            name: c.name,
            industry: c.industry,
            website: c.website,
            phone: c.phone,
            active: true,
            createdBy: adminUser.id,
          },
        });
        companyIdMap.set(c.name, created.id);
        console.log(`  Company: ${c.name}`);
      }
    }

    // Seed contacts and build name→id map
    const contactIdMap = new Map<string, number>();
    for (const c of SEED_CONTACTS) {
      const fullName = `${c.firstName} ${c.lastName}`;
      const existing = await (prisma as any).crmContact.findFirst({
        where: { tenantId: tenant.id, firstName: c.firstName, lastName: c.lastName },
      });
      if (existing) {
        contactIdMap.set(fullName, existing.id);
        console.log(`  Contact already exists: ${fullName}`);
      } else {
        const companyId = companyIdMap.get(c.companyName) ?? null;
        const created = await (prisma as any).crmContact.create({
          data: {
            tenantId: tenant.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            title: c.title,
            phone: c.phone,
            companyId,
            active: true,
            createdBy: adminUser.id,
          },
        });
        contactIdMap.set(fullName, created.id);
        console.log(`  Contact: ${fullName}`);
      }
    }

    // Seed opportunities
    for (const o of SEED_OPPORTUNITIES) {
      const existing = await (prisma as any).crmOpportunity.findFirst({
        where: { tenantId: tenant.id, title: o.title },
      });
      if (existing) {
        console.log(`  Opportunity already exists: ${o.title}`);
        continue;
      }
      const companyId = companyIdMap.get(o.companyName) ?? null;
      const contactId = o.contactName ? contactIdMap.get(o.contactName) ?? null : null;
      await (prisma as any).crmOpportunity.create({
        data: {
          tenantId: tenant.id,
          title: o.title,
          stage: o.stage,
          value: o.value,
          currency: o.currency,
          probability: o.probability,
          companyId,
          contactId,
          createdBy: adminUser.id,
        },
      });
      console.log(`  Opportunity: ${o.title}`);
    }
  }

  console.log('\nDone!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
