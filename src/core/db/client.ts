import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type pg from 'pg';

// Builds the pg pool config for the runtime (pooled) connection.
// On Vercel each serverless instance keeps its own pool *in front of* Supabase's
// Supavisor transaction pooler, so the per-instance pool is kept tiny and idle
// connections are released quickly to avoid exhausting the upstream pooler.
function poolConfig(): pg.PoolConfig {
  const url = new URL(process.env.DATABASE_URL!);
  const sslmode = url.searchParams.get('sslmode');
  const ca = process.env.DATABASE_CA_CERT;

  let ssl: pg.PoolConfig['ssl'];
  if (sslmode === 'disable') {
    ssl = false; // local/dev only
  } else if (ca) {
    // Strict verification against the Supabase project CA (recommended in prod).
    ssl = { ca, rejectUnauthorized: true };
  } else {
    // TLS on, chain not verified. Set DATABASE_CA_CERT to harden to full verification.
    ssl = { rejectUnauthorized: false };
  }

  const max = Number(process.env.DATABASE_POOL_MAX) ||
    (process.env.NODE_ENV === 'production' ? 1 : 10);

  return {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg(poolConfig()),
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
