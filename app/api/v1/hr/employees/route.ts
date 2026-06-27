import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'hr', permissionsAny: ['hr.employee.read'] },
  async (_request, ctx) => {
    const { session, query } = ctx;
    const tenantId = session.tenantId;

    const page = Math.max(1, parseInt(query.get('page') ?? '1', 10));
    const limit = Math.max(1, parseInt(query.get('limit') ?? '20', 10));
    const search = query.get('search') ?? undefined;
    const departmentIdParam = query.get('departmentId');
    const departmentId = departmentIdParam ? parseInt(departmentIdParam, 10) : undefined;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        select: {
          id: true,
          name: true,
          email: true,
          orgRole: true,
          createdAt: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return ok({ data, total, page, totalPages: Math.ceil(total / limit) });
  },
);
