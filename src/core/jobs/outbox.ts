import { prisma } from '@/src/core/db/client';
import { logger } from '@/src/core/logger';

// Durable background-job queue. Producers enqueue (cheap insert); the Vercel Cron route
// drains via processOutbox(). Keeps slow/external work (email, etc.) off the request path.

const p = prisma as unknown as {
  jobOutbox: {
    create: (a: unknown) => Promise<unknown>;
    update: (a: unknown) => Promise<unknown>;
  };
  $queryRawUnsafe: (q: string, ...v: unknown[]) => Promise<Array<{ id: number; kind: string; payload: Record<string, unknown>; attempts: number }>>;
};

const MAX_ATTEMPTS = 5;

export async function enqueueJob(kind: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await p.jobOutbox.create({ data: { kind, payload } });
  } catch (e) {
    logger.error('system', 'job_enqueue_failed', { kind, error: e instanceof Error ? e.message : String(e) });
  }
}

export async function processOutbox(limit = 50): Promise<{ claimed: number; processed: number; failed: number }> {
  // Atomically claim a batch (FOR UPDATE SKIP LOCKED) so overlapping cron runs never
  // double-process the same job.
  const claimed = await p.$queryRawUnsafe(
    `UPDATE job_outbox SET status = 'processing', attempts = attempts + 1
     WHERE id IN (
       SELECT id FROM job_outbox
       WHERE status = 'pending' AND run_after <= now()
       ORDER BY id
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, kind, payload, attempts`,
    limit,
  );

  let processed = 0;
  let failed = 0;
  for (const job of claimed) {
    try {
      await runJob(job.kind, job.payload);
      await p.jobOutbox.update({ where: { id: job.id }, data: { status: 'done', processedAt: new Date() } });
      processed++;
    } catch (e) {
      const giveUp = job.attempts >= MAX_ATTEMPTS;
      await p.jobOutbox.update({
        where: { id: job.id },
        data: {
          status: giveUp ? 'failed' : 'pending',
          lastError: e instanceof Error ? e.message : String(e),
          runAfter: giveUp ? undefined : new Date(Date.now() + backoffMs(job.attempts)),
        },
      });
      if (giveUp) failed++;
    }
  }
  return { claimed: claimed.length, processed, failed };
}

function backoffMs(attempts: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 3_600_000); // 1m,2m,4m… capped 1h
}

async function runJob(kind: string, payload: Record<string, unknown>): Promise<void> {
  switch (kind) {
    case 'email': {
      const { sendEmail } = await import('@/src/core/providers/email');
      const ok = await sendEmail(Number(payload.tenantId), {
        to: String(payload.to),
        subject: String(payload.subject),
        html: String(payload.html),
      });
      if (!ok) throw new Error('sendEmail returned false');
      break;
    }
    default:
      throw new Error(`Unknown job kind: ${kind}`);
  }
}
