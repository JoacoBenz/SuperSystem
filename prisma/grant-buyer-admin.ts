import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });
async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
  if (!tenant) throw new Error('no demo tenant');
  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: 'admin@demo.com' } });
  if (!admin) throw new Error('no admin@demo.com');

  const roles = await prisma.role.findMany({ where: { tenantId: tenant.id }, select: { name: true, id: true } });
  console.log('Available roles:', roles.map(r => r.name).join(', '));

  const buyerRole = roles.find(r => r.name === 'procurement.buyer');
  if (!buyerRole) { console.log('procurement.buyer role not found'); return; }

  const existing = await prisma.userRole.findFirst({ where: { userId: admin.id, roleId: buyerRole.id } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: buyerRole.id } });
    console.log('Granted procurement.buyer to admin@demo.com');
  } else {
    console.log('admin@demo.com already has procurement.buyer');
  }
}
main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
