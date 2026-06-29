import { prisma } from '@/src/core/db/client';
import { cached, invalidateCache } from '@/src/core/cache';
import { decryptField, encryptField } from '@/src/core/crypto/field-encryption';

// Per-tenant config keys that hold secrets — encrypted at rest, decrypted on read.
const SECRET_CONFIG_KEYS = new Set<string>([
  'resend_api_key',
  'mercadopago_access_token',
  'anthropic_api_key',
]);

export function isSecretConfigKey(key: string): boolean {
  return SECRET_CONFIG_KEYS.has(key);
}

/** Encrypt a config value before persisting it (no-op for non-secret keys). */
export function encryptConfigValue(key: string, value: string): string {
  return SECRET_CONFIG_KEYS.has(key) ? (encryptField(value) ?? value) : value;
}

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
  const raw = config.get(key);
  if (raw === undefined) return defaultValue;
  return SECRET_CONFIG_KEYS.has(key) ? (decryptField(raw) ?? defaultValue) : raw;
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
