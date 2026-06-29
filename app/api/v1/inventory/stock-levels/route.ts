import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';

export const GET = withAuth(
  { moduleId: 'inventory', permissionsAny: ['inventory.stock_entry.read'] },
  async (request, ctx) => {
    const tenantId = ctx.session.tenantId;

    // Aggregate stock keyed on the product master when present, else the free-text
    // description. Entries from receptions (conforming only) + adjustments.
    const [entries, adjustments] = await Promise.all([
      prisma.stockEntry.groupBy({
        by: ['productId', 'description', 'unit'],
        where: { tenantId, conforming: true },
        _sum: { quantity: true },
        _max: { receivedAt: true },
        _count: { id: true },
      }),
      prisma.stockAdjustment.groupBy({
        by: ['productId', 'description', 'unit'],
        where: { tenantId },
        _sum: { quantity: true },
        _max: { createdAt: true },
      }),
    ]);

    type Row = { productId: number | null; description: string; unit: string; receptionQty: number; adjustmentQty: number; lastUpdated: Date | null; receptionCount: number };
    const map = new Map<string, Row>();
    // Product-linked rows merge across descriptions; free-text rows key on description+unit.
    const keyOf = (r: { productId: number | null; description: string; unit: string }) =>
      r.productId ? `p:${r.productId}` : `d:${r.description}|${r.unit}`;

    for (const e of entries as any[]) {
      map.set(keyOf(e), {
        productId: e.productId ?? null,
        description: e.description,
        unit: e.unit,
        receptionQty: Number(e._sum.quantity ?? 0),
        adjustmentQty: 0,
        lastUpdated: e._max.receivedAt ?? null,
        receptionCount: e._count.id,
      });
    }

    for (const a of adjustments as any[]) {
      const key = keyOf(a);
      const adjQty = Number(a._sum.quantity ?? 0);
      const adjDate = a._max.createdAt ?? null;
      const existing = map.get(key);
      if (existing) {
        existing.adjustmentQty += adjQty;
        if (adjDate && (!existing.lastUpdated || adjDate > existing.lastUpdated)) existing.lastUpdated = adjDate;
      } else {
        map.set(key, { productId: a.productId ?? null, description: a.description, unit: a.unit, receptionQty: 0, adjustmentQty: adjQty, lastUpdated: adjDate, receptionCount: 0 });
      }
    }

    // Resolve product names/SKUs for the product-linked rows.
    const productIds = [...new Set([...map.values()].map(v => v.productId).filter((x): x is number => x != null))];
    const products = productIds.length
      ? await (prisma as any).product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, sku: true } })
      : [];
    const prodMap = new Map<number, { name: string; sku: string }>(products.map((p: any) => [p.id, p]));

    const levels = Array.from(map.values()).map(v => {
      const prod = v.productId != null ? prodMap.get(v.productId) : null;
      return {
        productId: v.productId,
        sku: prod?.sku ?? null,
        description: prod ? prod.name : v.description,
        unit: v.unit,
        totalQuantity: v.receptionQty + v.adjustmentQty,
        receptionQuantity: v.receptionQty,
        adjustmentQuantity: v.adjustmentQty,
        receptionCount: v.receptionCount,
        lastUpdated: v.lastUpdated,
      };
    }).sort((a, b) => a.description.localeCompare(b.description));

    return ok(levels);
  },
);
