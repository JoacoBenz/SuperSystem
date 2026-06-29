import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: {} as any }));
vi.mock('@/src/core/db/client', () => ({ prisma: mockPrisma }));
const enqueueMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/core/jobs/outbox', () => ({ enqueueJob: (...a: any[]) => enqueueMock(...a) }));

import { NotificationService } from '../notification.service';

beforeEach(() => {
  for (const k of Object.keys(mockPrisma)) delete mockPrisma[k];
  enqueueMock.mockClear();
  enqueueMock.mockResolvedValue(undefined);
});

describe('NotificationService email-out (Phase 3 + F outbox)', () => {
  it('notifyUser creates the in-app notification and enqueues an email job', async () => {
    mockPrisma.notification = { create: vi.fn().mockResolvedValue({}) };
    mockPrisma.user = { findFirst: vi.fn().mockResolvedValue({ email: 'a@b.com' }) };
    await new NotificationService(1).notifyUser(2, 't', 'Title', 'Msg');
    expect(mockPrisma.notification.create).toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledWith('email', expect.objectContaining({ to: 'a@b.com', subject: 'Title', tenantId: 1 }));
  });

  it('enqueue failure is non-fatal — the notification is still created', async () => {
    mockPrisma.notification = { create: vi.fn().mockResolvedValue({}) };
    mockPrisma.user = { findFirst: vi.fn().mockResolvedValue({ email: 'a@b.com' }) };
    enqueueMock.mockRejectedValueOnce(new Error('enqueue failed'));
    await expect(new NotificationService(1).notifyUser(2, 't', 'Title', 'Msg')).resolves.toBeUndefined();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it('notifyUsersWithPermission enqueues a job for every recipient with an address', async () => {
    mockPrisma.user = { findMany: vi.fn().mockResolvedValue([{ id: 1, email: 'a@b.com' }, { id: 2, email: 'c@d.com' }]) };
    mockPrisma.notification = { createMany: vi.fn().mockResolvedValue({}) };
    await new NotificationService(1).notifyUsersWithPermission('m.r.a', 't', 'T', 'M');
    expect(mockPrisma.notification.createMany).toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalledTimes(2);
  });
});
