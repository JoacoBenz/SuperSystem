import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * Application-level field encryption (AES-256-GCM) for sensitive columns/secrets, on top
 * of Supabase's at-rest disk encryption — so a leaked dump or DB-level access doesn't
 * expose bank numbers, tax IDs, or per-tenant API keys in cleartext.
 *
 * Design for safe, gradual rollout:
 *  - Values carry a version prefix (`enc:v1:`). decrypt() passes through anything that
 *    isn't prefixed, so pre-encryption (plaintext) rows keep working; encrypt() is
 *    idempotent. This means new writes are encrypted while old rows stay readable until
 *    a one-off backfill encrypts them — no flag-day required.
 *  - Key from ENCRYPTION_KEY (base64 or hex 32 bytes; otherwise derived via SHA-256 so
 *    any sufficiently random secret works). Rotating the key requires re-encrypting rows.
 */
const PREFIX = 'enc:v1:';

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  for (const enc of ['base64', 'hex'] as const) {
    const buf = Buffer.from(raw, enc);
    if (buf.length === 32) return buf;
  }
  // Fallback: derive a 32-byte key from an arbitrary secret string.
  return createHash('sha256').update(raw).digest();
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Encrypt a value. No-op for empty values, already-encrypted values, or no key (dev). */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext ?? null;
  }
  if (isEncrypted(plaintext)) return plaintext;
  const key = getKey();
  if (!key) return plaintext; // no key configured (prod env validation requires one)

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

/** Decrypt a value. Passes through plaintext (pre-encryption) and undecryptable values. */
export function decryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!isEncrypted(value)) return value;
  const key = getKey();
  if (!key) return value;

  try {
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return value; // wrong key / corrupt → return raw rather than throw
  }
}
