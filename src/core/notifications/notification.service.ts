import { prisma } from '@/src/core/db/client';
import { sendEmail } from '@/src/core/providers/email';

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
function emailHtml(title: string, message: string): string {
  return `<div style="font-family:system-ui,Arial,sans-serif"><h2 style="margin:0 0 8px">${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p style="color:#6b7280;font-size:12px">Sent by ERP Platform</p></div>`;
}

export class NotificationService {
  constructor(private tenantId: number) {}

  /** Best-effort outbound email mirroring an in-app notification — never throws. */
  private async dispatchEmails(emails: (string | null | undefined)[], title: string, message: string): Promise<void> {
    try {
      for (const to of emails) {
        if (to) await sendEmail(this.tenantId, { to, subject: title, html: emailHtml(title, message) });
      }
    } catch {
      /* outbound email is best-effort; in-app notification already persisted */
    }
  }

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

    const user = await prisma.user.findFirst({
      where: { id: recipientId, tenantId: this.tenantId, active: true, deletedAt: null },
      select: { email: true },
    });
    await this.dispatchEmails([user?.email], title, message);
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
      select: { id: true, email: true },
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

    await this.dispatchEmails(users.map(u => u.email), title, message);
  }
}
