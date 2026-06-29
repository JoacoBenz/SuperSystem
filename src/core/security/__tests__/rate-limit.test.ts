import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() } as any,
}));
vi.mock('@/src/core/db/client', () => ({ prisma: mockPrisma }));

import { checkRateLimit, peekRateLimit } from '../rate-limit';

beforeEach(() => {
  mockPrisma.$queryRawUnsafe.mockReset();
  mockPrisma.$executeRawUnsafe.mockReset();
});

describe('checkRateLimit', () => {
  it('allows while count is within the limit', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ count: 3, reset_at: new Date(Date.now() + 60_000) }]);
    const r = await checkRateLimit('login:a@b.com', 10, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(7);
  });

  it('blocks once count exceeds the limit', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ count: 11, reset_at: new Date(Date.now() + 60_000) }]);
    const r = await checkRateLimit('login:a@b.com', 10, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('fails OPEN when the store is unreachable', async () => {
    mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));
    const r = await checkRateLimit('login:a@b.com', 10, 60_000);
    expect(r.allowed).toBe(true);
  });

  it('peek returns null when there is no live window', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    expect(await peekRateLimit('lockout:a@b.com')).toBeNull();
  });
});
