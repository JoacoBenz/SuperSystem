import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

/**
 * Cross-module home overview.
 *
 * Returns a flat object of KPIs spanning every ERP module. Each module's
 * queries are wrapped in their own try/catch so a missing table or a module
 * that is disabled for the tenant can never break the whole response — that
 * module's fields simply fall back to 0 / []. Everything is scoped to the
 * caller's tenant.
 */
export const GET = withAuth({}, async (_request, ctx) => {
  const tenantId = ctx.session.tenantId;

  // ---- procurement: open purchase requests ----------------------------------
  let openPurchaseRequests = 0;
  try {
    openPurchaseRequests = await (prisma as any).purchaseRequest.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['draft', 'rejected', 'cancelled', 'closed'] },
      },
    });
  } catch {
    openPurchaseRequests = 0;
  }

  // ---- inventory: low-stock item count --------------------------------------
  // Stock level = conforming stock entries + adjustments, merged by
  // description+unit (same aggregation as the stock-levels route). An item is
  // "low" when its net quantity is <= 5.
  let lowStockItems = 0;
  try {
    const [entries, adjustments] = await Promise.all([
      (prisma as any).stockEntry.groupBy({
        by: ['description', 'unit'],
        where: { tenantId, conforming: true },
        _sum: { quantity: true },
      }),
      (prisma as any).stockAdjustment.groupBy({
        by: ['description', 'unit'],
        where: { tenantId },
        _sum: { quantity: true },
      }),
    ]);

    const levels = new Map<string, number>();
    for (const e of entries) {
      const key = e.description + '|' + e.unit;
      levels.set(key, (levels.get(key) ?? 0) + Number(e._sum?.quantity ?? 0));
    }
    for (const a of adjustments) {
      const key = a.description + '|' + a.unit;
      levels.set(key, (levels.get(key) ?? 0) + Number(a._sum?.quantity ?? 0));
    }

    lowStockItems = Array.from(levels.values()).filter((qty) => qty <= 5).length;
  } catch {
    lowStockItems = 0;
  }

  // ---- sales: orders count + confirmed revenue ------------------------------
  let salesOrders = 0;
  let salesConfirmedRevenue = 0;
  try {
    const [count, revenueAgg] = await Promise.all([
      (prisma as any).salesOrder.count({ where: { tenantId } }),
      (prisma as any).salesOrder.aggregate({
        where: { tenantId, status: { in: ['confirmed', 'shipped', 'delivered'] } },
        _sum: { totalAmount: true },
      }),
    ]);
    salesOrders = count;
    salesConfirmedRevenue = Number(revenueAgg._sum?.totalAmount ?? 0);
  } catch {
    salesOrders = 0;
    salesConfirmedRevenue = 0;
  }

  // ---- crm: open pipeline value ---------------------------------------------
  let crmOpenPipelineValue = 0;
  try {
    const open = await (prisma as any).crmOpportunity.findMany({
      where: { tenantId, stage: { notIn: ['won', 'lost'] } },
      select: { value: true },
    });
    crmOpenPipelineValue = (open as any[]).reduce(
      (sum: number, o: any) => sum + (o.value ? Number(o.value) : 0),
      0,
    );
  } catch {
    crmOpenPipelineValue = 0;
  }

  // ---- projects: active projects + open tasks -------------------------------
  let activeProjects = 0;
  let openTasks = 0;
  try {
    const [projects, tasks] = await Promise.all([
      (prisma as any).project.count({ where: { tenantId, status: 'active' } }),
      (prisma as any).task.count({
        where: { tenantId, status: { notIn: ['done', 'cancelled'] } },
      }),
    ]);
    activeProjects = projects;
    openTasks = tasks;
  } catch {
    activeProjects = 0;
    openTasks = 0;
  }

  // ---- treasury: total balance (active bank accounts) -----------------------
  let treasuryTotalBalance = 0;
  try {
    const accounts = await (prisma as any).bankAccount.findMany({
      where: { tenantId, isActive: true },
      select: { balance: true },
    });
    treasuryTotalBalance = (accounts as any[]).reduce(
      (sum: number, a: any) => sum + Number(a.balance ?? 0),
      0,
    );
  } catch {
    treasuryTotalBalance = 0;
  }

  // ---- accounting: total assets / total liabilities -------------------------
  let accountingTotalAssets = 0;
  let accountingTotalLiabilities = 0;
  try {
    const [assetAgg, liabilityAgg] = await Promise.all([
      (prisma as any).chartOfAccount.aggregate({
        where: { tenantId, type: 'asset' },
        _sum: { balance: true },
      }),
      (prisma as any).chartOfAccount.aggregate({
        where: { tenantId, type: 'liability' },
        _sum: { balance: true },
      }),
    ]);
    accountingTotalAssets = Number(assetAgg._sum?.balance ?? 0);
    accountingTotalLiabilities = Number(liabilityAgg._sum?.balance ?? 0);
  } catch {
    accountingTotalAssets = 0;
    accountingTotalLiabilities = 0;
  }

  // ---- budget: total planned / total actual ---------------------------------
  let budgetTotalPlanned = 0;
  let budgetTotalActual = 0;
  try {
    const [plannedAgg, actualAgg] = await Promise.all([
      (prisma as any).budgetPlan.aggregate({
        where: { tenantId, status: 'active' },
        _sum: { totalAmount: true },
      }),
      (prisma as any).budgetPlanItem.aggregate({
        where: { tenantId, budgetPlan: { status: 'active' } },
        _sum: { actualAmount: true },
      }),
    ]);
    budgetTotalPlanned = Number(plannedAgg._sum?.totalAmount ?? 0);
    budgetTotalActual = Number(actualAgg._sum?.actualAmount ?? 0);
  } catch {
    budgetTotalPlanned = 0;
    budgetTotalActual = 0;
  }

  // ---- hr: employee count ---------------------------------------------------
  let employeeCount = 0;
  try {
    employeeCount = await (prisma as any).user.count({
      where: { tenantId, deletedAt: null, orgRole: { not: 'super_admin' } },
    });
  } catch {
    employeeCount = 0;
  }

  return ok({
    procurement: { openPurchaseRequests },
    inventory: { lowStockItems },
    sales: { orders: salesOrders, confirmedRevenue: salesConfirmedRevenue },
    crm: { openPipelineValue: crmOpenPipelineValue },
    projects: { activeProjects, openTasks },
    treasury: { totalBalance: treasuryTotalBalance },
    accounting: {
      totalAssets: accountingTotalAssets,
      totalLiabilities: accountingTotalLiabilities,
    },
    budget: { totalPlanned: budgetTotalPlanned, totalActual: budgetTotalActual },
    hr: { employeeCount },
  });
});
