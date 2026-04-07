import { prisma } from '@/src/core/db/client';
import { cached } from '@/src/core/cache';
import { today } from '@/src/shared/utils/date';

export async function getEffectiveRoleIds(
  tenantId: number,
  userId: number
): Promise<number[]> {
  const cacheKey = `t:${tenantId}:delegations:${userId}`;

  return cached(cacheKey, 300_000, async () => {
    const now = today();
    const delegations = await prisma.delegation.findMany({
      where: {
        tenantId,
        delegateId: userId,
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: { roleId: true },
    });

    return delegations.map(d => d.roleId);
  });
}

export async function resolveUserPermissions(
  tenantId: number,
  userId: number
): Promise<string[]> {
  const cacheKey = `t:${tenantId}:permissions:${userId}`;

  return cached(cacheKey, 300_000, async () => {
    // Get direct roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    // Get delegated roles
    const delegatedRoleIds = await getEffectiveRoleIds(tenantId, userId);
    const delegatedRoles = delegatedRoleIds.length > 0
      ? await prisma.role.findMany({
          where: { id: { in: delegatedRoleIds } },
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        })
      : [];

    const allRoles = [
      ...userRoles.map(ur => ur.role),
      ...delegatedRoles,
    ];

    const permissions = new Set<string>();
    for (const role of allRoles) {
      for (const rp of role.rolePermissions) {
        const perm = `${rp.permission.moduleId}.${rp.permission.resource}.${rp.permission.action}`;
        permissions.add(perm);
      }
    }

    return Array.from(permissions);
  });
}
