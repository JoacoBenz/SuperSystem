import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  const sql = readFileSync(
    join(__dirname, 'migrations/20260627000001_add_sales/migration.sql'),
    'utf-8'
  );
  console.log('Running sales migration...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Migration complete.');
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
