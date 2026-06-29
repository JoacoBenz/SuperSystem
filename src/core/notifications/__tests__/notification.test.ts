import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: {} as any }));
vi.mock('@/src/core/db/client', () => ({ prisma: mockPrisma }));
const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock('@/src/core/providers/email', () => ({ sendEmail: (...a: any[]) => sendEmailMock(...a) }));

import { NotificationService } from '../notification.service';

beforeEach(() => {
  for (const k of Object.keys(mockPrisma)) delete mockPrisma[k];
  sendEmailMock.mockClear();
  sendEmailMock.mockResolvedValue(true);
});

describe('NotificationService email-out (Phase 3)', () => {
  it('notifyUser creates the in-app notification and dispatches an email', async () => {
    mockPrisma.notification = { create: vi.fn().mockResolvedValue({}) };
    mockPrisma.user = { findFirst: vi.fn().mockResolvedValue({ email: 'a@b.com' }) };
    await new NotificationService(1).notifyUser(2, 't', 'Title', 'Msg');
    expect(mockPrisma.notification.create).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(1, expect.objectContaining({ to: 'a@b.com', subject: 'Title' }));
  });

  it('email failure is non-fatal — the notification is still created', async () => {
    mockPrisma.notification = { create: vi.fn().mockResolvedValue({}) };
    mockPrisma.user = { findFirst: vi.fn().mockResolvedValue({ email: 'a@b.com' }) };
    sendEmailMock.mockRejectedValueOnce(new Error('smtp down'));
    await expect(new NotificationService(1).notifyUser(2, 't', 'Title', 'Msg')).resolves.toBeUndefined();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it('notifyUsersWithPermission emails every recipient with an address', async () => {
    mockPrisma.user = { findMany: vi.fn().mockResolvedValue([{ id: 1, email: 'a@b.com' }, { id: 2, email: 'c@d.com' }]) };
    mockPrisma.notification = { createMany: vi.fn().mockResolvedValue({}) };
    await new NotificationService(1).notifyUsersWithPermission('m.r.a', 't', 'T', 'M');
    expect(mockPrisma.notification.createMany).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });
});
