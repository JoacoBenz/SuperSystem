import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const PROJECTS_PERMISSIONS = [
  { resource: 'project', action: 'read', description: 'View projects' },
  { resource: 'project', action: 'manage', description: 'Create, edit, and delete projects' },
  { resource: 'task', action: 'read', description: 'View tasks' },
  { resource: 'task', action: 'manage', description: 'Create, edit, and delete tasks' },
  { resource: 'time_entry', action: 'read', description: 'View time entries' },
  { resource: 'time_entry', action: 'manage', description: 'Log and edit time entries' },
];

const PROJECTS_ROLES = [
  {
    name: 'projects.manager',
    displayName: 'Project Manager',
    permissions: [
      'projects.project.read',
      'projects.project.manage',
      'projects.task.read',
      'projects.task.manage',
      'projects.time_entry.read',
      'projects.time_entry.manage',
    ],
  },
  {
    name: 'projects.member',
    displayName: 'Project Member',
    permissions: [
      'projects.project.read',
      'projects.task.read',
      'projects.task.manage',
      'projects.time_entry.read',
      'projects.time_entry.manage',
    ],
  },
  {
    name: 'projects.viewer',
    displayName: 'Project Viewer',
    permissions: [
      'projects.project.read',
      'projects.task.read',
      'projects.time_entry.read',
    ],
  },
];

const SEED_PROJECTS = [
  {
    name: 'ERP Platform Redesign',
    description: 'Complete redesign of the ERP platform UI/UX for better usability and modern aesthetics.',
    status: 'active',
    priority: 'high',
    budget: 75000,
    currency: 'USD',
    tasks: [
      {
        title: 'Design new dashboard wireframes',
        description: 'Create wireframes for the main dashboard and module pages.',
        status: 'done',
        priority: 'high',
        estimatedHours: 16,
        timeEntries: [
          { hours: 8, description: 'Initial wireframe sketches' },
          { hours: 6, description: 'Stakeholder revisions' },
        ],
      },
      {
        title: 'Implement component library',
        description: 'Build reusable UI components following the new design system.',
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 40,
        timeEntries: [
          { hours: 12, description: 'Button, Input, and Card components' },
          { hours: 8, description: 'Table and Modal components' },
        ],
      },
      {
        title: 'Write E2E tests for new flows',
        description: 'Cover critical user journeys with Playwright tests.',
        status: 'todo',
        priority: 'medium',
        estimatedHours: 24,
        timeEntries: [],
      },
    ],
  },
  {
    name: 'Customer Portal Integration',
    description: 'Integrate the ERP with the external customer portal for self-service order tracking.',
    status: 'planning',
    priority: 'medium',
    budget: 32000,
    currency: 'USD',
    tasks: [
      {
        title: 'API contract definition',
        description: 'Define OpenAPI spec for the integration endpoints.',
        status: 'in_progress',
        priority: 'high',
        estimatedHours: 8,
        timeEntries: [
          { hours: 4, description: 'Draft OpenAPI spec v1' },
        ],
      },
      {
        title: 'OAuth2 SSO setup',
        description: 'Configure single sign-on between ERP and customer portal.',
        status: 'todo',
        priority: 'high',
        estimatedHours: 12,
        timeEntries: [],
      },
      {
        title: 'Order tracking webhook',
        description: 'Implement webhook to push order status updates to the portal.',
        status: 'todo',
        priority: 'medium',
        estimatedHours: 20,
        timeEntries: [],
      },
    ],
  },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: { not: 'platform' } } });
  console.log(`Setting up Projects for ${tenants.length} tenant(s)...`);

  // Upsert permissions globally
  const permMap = new Map<string, number>();
  for (const p of PROJECTS_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { moduleId_resource_action: { moduleId: 'projects', resource: p.resource, action: p.action } },
      update: { description: p.description },
      create: { moduleId: 'projects', resource: p.resource, action: p.action, description: p.description },
    });
    permMap.set(`projects.${p.resource}.${p.action}`, perm.id);
    console.log(`  Permission: projects.${p.resource}.${p.action} (id: ${perm.id})`);
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (id: ${tenant.id})`);

    // Enable module
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'projects' } },
      update: { enabled: true },
      create: { tenantId: tenant.id, moduleId: 'projects', enabled: true },
    });
    console.log('  Module enabled');

    // Upsert roles
    for (const roleDef of PROJECTS_ROLES) {
      const role = await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
        update: { displayName: roleDef.displayName, isSystem: true, moduleId: 'projects' },
        create: {
          tenantId: tenant.id,
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.displayName,
          isSystem: true,
          moduleId: 'projects',
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

    // Grant projects.manager to all admin users
    const adminUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, orgRole: 'admin' } });
    const managerRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'projects.manager' } });
    if (managerRole) {
      for (const u of adminUsers) {
        const existing = await prisma.userRole.findFirst({
          where: { userId: u.id, roleId: managerRole.id },
        });
        if (!existing) {
          await prisma.userRole.create({ data: { userId: u.id, roleId: managerRole.id } });
          console.log(`  Granted projects.manager to ${u.email}`);
        }
      }
    }

    // Seed sample data
    const adminUser = adminUsers[0];
    if (!adminUser) {
      console.log('  No admin user found, skipping seed data');
      continue;
    }

    for (const projectDef of SEED_PROJECTS) {
      const existingProject = await (prisma as any).project.findFirst({
        where: { tenantId: tenant.id, name: projectDef.name },
      });
      if (existingProject) {
        console.log(`  Project already exists: ${projectDef.name}`);
        continue;
      }

      const project = await (prisma as any).project.create({
        data: {
          tenantId: tenant.id,
          name: projectDef.name,
          description: projectDef.description,
          status: projectDef.status,
          priority: projectDef.priority,
          budget: projectDef.budget,
          currency: projectDef.currency,
          createdBy: adminUser.id,
        },
      });
      console.log(`  Project: ${project.name} (id: ${project.id})`);

      for (const taskDef of projectDef.tasks) {
        const task = await (prisma as any).task.create({
          data: {
            tenantId: tenant.id,
            projectId: project.id,
            title: taskDef.title,
            description: taskDef.description,
            status: taskDef.status,
            priority: taskDef.priority,
            estimatedHours: taskDef.estimatedHours,
            createdBy: adminUser.id,
          },
        });
        console.log(`    Task: ${task.title} (id: ${task.id})`);

        for (const entryDef of taskDef.timeEntries) {
          await (prisma as any).timeEntry.create({
            data: {
              tenantId: tenant.id,
              taskId: task.id,
              userId: adminUser.id,
              hours: entryDef.hours,
              description: entryDef.description,
              date: new Date(),
            },
          });
          console.log(`      Time entry: ${entryDef.hours}h - ${entryDef.description}`);
        }
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
