import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const p = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });
async function main() {
  const vendors = await p.vendor.findMany({ where: { tenantId: 2 }, select: { id: true, name: true, deletedAt: true, active: true } });
  console.log('Vendors for tenant 2:', JSON.stringify(vendors, null, 2));
  const all = await p.vendor.count();
  console.log('Total vendors (all tenants):', all);
}
main().catch(console.error).finally(() => p.$disconnect());
