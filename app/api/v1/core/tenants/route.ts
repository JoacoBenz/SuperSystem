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

    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null, slug: { not: 'platform' } },
      include: {
        _count: { select: { users: true, tenantModules: true } },
        tenantModules: { where: { enabled: true }, select: { moduleId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok(tenants);
  },
);
