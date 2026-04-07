import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const { session, query } = ctx;
    const isSuperAdmin = session.orgRole === 'super_admin';
    const effectiveTenantId = isSuperAdmin && query.has('tenant_id')
      ? parseInt(query.get('tenant_id')!, 10)
      : session.tenantId;

    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { tenantId: null, isSystem: true },
          { tenantId: effectiveTenantId },
        ],
      },
      include: {
        rolePermissions: {
          include: { permission: { select: { id: true, moduleId: true, resource: true, action: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return ok(roles);
  },
);
