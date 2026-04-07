import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  managerId: z.number().int().positive().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
});

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const { db, query } = ctx;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '50');

    const [data, total] = await Promise.all([
      db.department.findMany({
        where: { deletedAt: null },
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } },
          _count: { select: { users: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.department.count({ where: { deletedAt: null } }),
    ]);

    return paginated(data, total, page, pageSize);
  },
);

export const POST = withAuth(
  { permissions: ['core.department.manage'], body: createDepartmentSchema },
  async (request, ctx) => {
    const { body, db, audit } = ctx;

    const dept = await db.department.create({
      data: {
        name: body.name,
        managerId: body.managerId ?? null,
        parentId: body.parentId ?? null,
      } as any,
    });

    await audit.log({
      action: 'create', resource: 'department', resourceId: dept.id,
      newData: { name: dept.name },
    });

    return created(dept);
  },
);
