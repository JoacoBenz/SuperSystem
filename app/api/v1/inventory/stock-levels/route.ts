import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'inventory', permissionsAny: ['inventory.stock_entry.read'] },
  async (request, ctx) => {
    const tenantId = ctx.session.tenantId;

    // Aggregate: entries from receptions (conforming only) + adjustments
    const [entries, adjustments] = await Promise.all([
      prisma.stockEntry.groupBy({
        by: ['description', 'unit'],
        where: { tenantId, conforming: true },
        _sum: { quantity: true },
        _max: { receivedAt: true },
        _count: { id: true },
      }),
      prisma.stockAdjustment.groupBy({
        by: ['description', 'unit'],
        where: { tenantId },
        _sum: { quantity: true },
        _max: { createdAt: true },
      }),
    ]);

    // Merge by description+unit
    const map = new Map<string, { description: string; unit: string; receptionQty: number; adjustmentQty: number; lastUpdated: Date | null; receptionCount: number }>();

    for (const e of entries) {
      const key = e.description + '|' + e.unit;
      map.set(key, {
        description: e.description,
        unit: e.unit,
        receptionQty: Number(e._sum.quantity ?? 0),
        adjustmentQty: 0,
        lastUpdated: e._max.receivedAt ?? null,
        receptionCount: e._count.id,
      });
    }

    for (const a of adjustments) {
      const key = a.description + '|' + a.unit;
      const existing = map.get(key);
      const adjQty = Number(a._sum.quantity ?? 0);
      const adjDate = a._max.createdAt ?? null;
      if (existing) {
        existing.adjustmentQty += adjQty;
        if (adjDate && (!existing.lastUpdated || adjDate > existing.lastUpdated)) {
          existing.lastUpdated = adjDate;
        }
      } else {
        map.set(key, {
          description: a.description,
          unit: a.unit,
          receptionQty: 0,
          adjustmentQty: adjQty,
          lastUpdated: adjDate,
          receptionCount: 0,
        });
      }
    }

    const levels = Array.from(map.values()).map(v => ({
      description: v.description,
      unit: v.unit,
      totalQuantity: v.receptionQty + v.adjustmentQty,
      receptionQuantity: v.receptionQty,
      adjustmentQuantity: v.adjustmentQty,
      receptionCount: v.receptionCount,
      lastUpdated: v.lastUpdated,
    })).sort((a, b) => a.description.localeCompare(b.description));

    return ok(levels);
  },
);
