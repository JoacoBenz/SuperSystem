import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { z } from 'zod';
import { hash } from 'bcryptjs';

const createUserSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().max(255),
  password: z.string().min(10).optional(),
  departmentId: z.number().int().positive().optional().nullable(),
  orgRole: z.enum(['admin', 'member']).default('member'),
});

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const { query, db } = ctx;
    const page = parseInt(query.get('page') ?? '1');
    const pageSize = parseInt(query.get('limit') ?? '20');
    const search = query.get('search') ?? undefined;

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.user.findMany({
        where: where as any,
        include: {
          department: { select: { id: true, name: true } },
          userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where: where as any }),
    ]);

    // Remove password hash from response
    const safeData = data.map(({ passwordHash, ...rest }) => rest);
    return paginated(safeData, total, page, pageSize);
  },
);

export const POST = withAuth(
  { body: createUserSchema },
  async (request, ctx) => {
    const { body, db, audit } = ctx;
    const passwordHash = body.password ? await hash(body.password, 12) : null;

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        departmentId: body.departmentId ?? null,
        orgRole: body.orgRole,
        createdBy: ctx.session.userId,
        updatedBy: ctx.session.userId,
      } as any,
    });

    await audit.log({
      action: 'create',
      resource: 'user',
      resourceId: user.id,
      eventType: 'permission',
      newData: { name: user.name, email: user.email, orgRole: user.orgRole },
    });

    const { passwordHash: _, ...safeUser } = user;
    return created(safeUser);
  },
);
