import { prisma } from '@/src/core/db/client';
import { logger } from '@/src/core/logger';

export interface CreateNotificationInput {
  tenantId: number;
  recipientId: number;
  moduleId?: string;
  type: string;
  title: string;
  message?: string;
  resourceType?: string;
  resourceId?: number;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        recipientId: input.recipientId,
        moduleId: input.moduleId ?? null,
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
      },
    });
  } catch (error) {
    logger.error('notification', 'notification_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      input,
    });
  }
}

export async function notifyByRole(
  tenantId: number,
  roleName: string,
  type: string,
  title: string,
  message?: string,
  resourceType?: string,
  resourceId?: number,
  moduleId?: string,
): Promise<void> {
  try {
    const users = await prisma.userRole.findMany({
      where: {
        role: { name: roleName },
        user: { tenantId, active: true, deletedAt: null },
      },
      select: { userId: true },
    });

    await Promise.all(
      users.map(u =>
        createNotification({
          tenantId,
          recipientId: u.userId,
          moduleId,
          type,
          title,
          message,
          resourceType,
          resourceId,
        })
      )
    );
  } catch (error) {
    logger.error('notification', 'bulk_notification_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      roleName,
    });
  }
}
