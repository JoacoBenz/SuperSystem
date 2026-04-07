import { prisma } from '@/src/core/db/client';
import { cached, invalidateCache } from '@/src/core/cache';

export async function getTenantConfig(tenantId: number): Promise<Map<string, string>> {
  const cacheKey = `t:${tenantId}:config`;
  const entries = await cached(cacheKey, 300_000, async () => {
    const rows = await prisma.tenantConfig.findMany({
      where: { tenantId },
    });
    return rows.map(r => [r.key, r.value] as [string, string]);
  });
  return new Map(entries);
}

export async function getTenantConfigValue(
  tenantId: number,
  key: string,
  defaultValue = '',
): Promise<string> {
  const config = await getTenantConfig(tenantId);
  return config.get(key) ?? defaultValue;
}

export async function getTenantConfigBool(
  tenantId: number,
  key: string,
  defaultValue = false,
): Promise<boolean> {
  const val = await getTenantConfigValue(tenantId, key);
  if (!val) return defaultValue;
  return val === 'true' || val === '1';
}

export async function getTenantConfigNumber(
  tenantId: number,
  key: string,
  defaultValue = 0,
): Promise<number> {
  const val = await getTenantConfigValue(tenantId, key);
  if (!val) return defaultValue;
  const num = Number(val);
  return isNaN(num) ? defaultValue : num;
}

export function invalidateTenantConfig(tenantId: number): void {
  invalidateCache(`t:${tenantId}:config`);
}
