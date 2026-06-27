import { prisma } from '@/src/core/db/client';

export class NotificationService {
  constructor(private tenantId: number) {}

  async notifyUser(
    recipientId: number,
    type: string,
    title: string,
    message: string,
    resourceType?: string,
    resourceId?: number,
    moduleId = 'procurement',
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        tenantId: this.tenantId,
        recipientId,
        moduleId,
        type,
        title,
        message,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
      },
    });
  }

  async notifyUsersWithPermission(
    permission: string,
    type: string,
    title: string,
    message: string,
    resourceType?: string,
    resourceId?: number,
    moduleId = 'procurement',
  ): Promise<void> {
    const [moduleId2, resource, action] = permission.split('.');
    const users = await prisma.user.findMany({
      where: {
        tenantId: this.tenantId,
        active: true,
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              rolePermissions: {
                some: { permission: { moduleId: moduleId2, resource, action } },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map(u => ({
        tenantId: this.tenantId,
        recipientId: u.id,
        moduleId,
        type,
        title,
        message,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
      })),
    });
  }
}
