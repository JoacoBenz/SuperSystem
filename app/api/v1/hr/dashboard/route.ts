import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'hr', permissionsAny: ['hr.dashboard.read'] },
  async (_request, ctx) => {
    const { session } = ctx;
    const tenantId = session.tenantId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEmployees, newThisMonth, departments] = await Promise.all([
      prisma.user.count({
        where: { tenantId, deletedAt: null, orgRole: { not: 'super_admin' } },
      }),
      prisma.user.count({
        where: { tenantId, deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
      prisma.department.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true },
      }),
    ]);

    const userCounts = await Promise.all(
      departments.map(d =>
        prisma.user.count({ where: { tenantId, departmentId: d.id, deletedAt: null } }),
      ),
    );
    const byDepartment = departments.map((d, i) => ({
      id: d.id,
      name: d.name,
      count: userCounts[i],
    }));

    const recentHires = await prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        departmentId: true,
        orgRole: true,
        department: { select: { name: true } },
      },
    });

    return ok({ totalEmployees, newThisMonth, byDepartment, recentHires });
  },
);
