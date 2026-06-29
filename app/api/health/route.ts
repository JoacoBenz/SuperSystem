import { NextResponse } from 'next/server';
import { prisma } from '@/src/core/db/client';

/** Unauthenticated liveness/readiness probe. Pings the DB so a broken connection shows. */
export async function GET() {
  let db = 'ok';
  try {
    await (prisma as unknown as { $queryRawUnsafe: (q: string) => Promise<unknown> }).$queryRawUnsafe('SELECT 1');
  } catch {
    db = 'error';
  }
  const healthy = db === 'ok';
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', db, time: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
