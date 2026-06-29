import { NextResponse } from 'next/server';
import { processOutbox } from '@/src/core/jobs/outbox';
import { logger } from '@/src/core/logger';

/**
 * Vercel Cron entrypoint: drains the job outbox. Secured by CRON_SECRET — Vercel sends
 * it as `Authorization: Bearer <CRON_SECRET>`. Returns 401 if it doesn't match (or if
 * no secret is configured, so it can't be triggered anonymously).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await processOutbox(50);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error('system', 'cron_process_jobs_failed', { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: 'processing failed' }, { status: 500 });
  }
}
