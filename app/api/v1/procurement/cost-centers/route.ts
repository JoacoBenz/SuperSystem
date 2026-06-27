import { withAuth } from '@/src/core/api/handler';
import { paginated, created } from '@/src/core/api/response';
import { CostCenterService } from '@/src/modules/procurement/services/cost-center.service';
import { costCenterSchema } from '@/src/modules/procurement/validators/cost-center.schema';

export const GET = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.cost_center.read'] },
  async (request, ctx) => {
    const { query } = ctx;
    const service = new CostCenterService(ctx.db, ctx.audit);
    const result = await service.list({
      page: parseInt(query.get('page') ?? '1'),
      pageSize: parseInt(query.get('limit') ?? '50'),
      active: query.get('active') !== null ? query.get('active') === 'true' : undefined,
    });
    return paginated(result.data, result.total, result.page, parseInt(query.get('limit') ?? '50'));
  },
);

export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.cost_center.manage'], body: costCenterSchema },
  async (request, ctx) => {
    const service = new CostCenterService(ctx.db, ctx.audit);
    const cc = await service.create(ctx.body);
    return created(cc);
  },
);
