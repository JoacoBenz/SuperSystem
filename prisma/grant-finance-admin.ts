import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL ?? process.env.DIRECT_URL!) });
async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
  if (!tenant) throw new Error('demo tenant not found');
  const adminUser = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: 'admin@demo.com' } });
  if (!adminUser) throw new Error('admin not found');
  const role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'treasurer' } });
  if (!role) throw new Error('treasurer role not found');
  const existing = await prisma.userRole.findFirst({ where: { userId: adminUser.id, roleId: role.id } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: role.id } });
    console.log('Granted treasurer to admin@demo.com');
  } else {
    console.log('admin@demo.com already has treasurer role');
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
