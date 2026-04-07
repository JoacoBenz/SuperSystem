import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { apiError } from '@/src/core/api/errors';

export const GET = withAuth(
  {},
  async (request, ctx) => {
    if (ctx.session.orgRole !== 'super_admin') {
      return apiError('FORBIDDEN', 'Only super admins can access tenants', 403);
    }

    const id = parseInt(ctx.params.id, 10);
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, name: true, email: true, orgRole: true, active: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        tenantModules: true,
        tenantConfigs: true,
        _count: { select: { users: true } },
      },
    });

    if (!tenant) {
      return apiError('NOT_FOUND', 'Tenant not found', 404);
    }

    return ok(tenant);
  },
);
