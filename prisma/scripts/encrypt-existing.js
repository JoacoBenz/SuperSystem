/*
 * One-off backfill: encrypt existing plaintext values for the fields the app now
 * encrypts/decrypts (bank account numbers + secret tenant_configs). Idempotent — skips
 * already-encrypted (enc:v1:) values, so it's safe to re-run.
 *
 * Run AFTER setting ENCRYPTION_KEY (same value the app uses):
 *   node prisma/scripts/encrypt-existing.js
 *
 * Format mirrors src/core/crypto/field-encryption.ts exactly. Only covers fields the app
 * round-trips today; do NOT add vendors/customers tax_id here until their routes
 * encrypt/decrypt too (else the UI would show ciphertext).
 */
require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

const PREFIX = 'enc:v1:';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  for (const enc of ['base64', 'hex']) {
    const buf = Buffer.from(raw, enc);
    if (buf.length === 32) return buf;
  }
  return crypto.createHash('sha256').update(raw).digest();
}

const KEY = getKey();
const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX);

function encrypt(plaintext) {
  if (plaintext == null || plaintext === '' || isEncrypted(plaintext)) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

async function backfillColumn(client, table, col) {
  try {
    const { rows } = await client.query(
      `SELECT id, ${col} AS val FROM ${table} WHERE ${col} IS NOT NULL AND ${col} <> ''`,
    );
    let n = 0;
    for (const r of rows) {
      if (isEncrypted(r.val)) continue;
      await client.query(`UPDATE ${table} SET ${col} = $1 WHERE id = $2`, [encrypt(r.val), r.id]);
      n++;
    }
    console.log(`  ${table}.${col}: encrypted ${n} row(s)`);
  } catch (e) {
    console.warn(`  ${table}.${col}: skipped (${e.message})`);
  }
}

(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  console.log('Encrypting existing sensitive values...');

  await backfillColumn(client, 'bank_accounts', 'account_number');

  const secretKeys = ['resend_api_key', 'mercadopago_access_token', 'anthropic_api_key'];
  try {
    const { rows } = await client.query(
      `SELECT tenant_id, key, value FROM tenant_configs WHERE key = ANY($1) AND value IS NOT NULL AND value <> ''`,
      [secretKeys],
    );
    let n = 0;
    for (const r of rows) {
      if (isEncrypted(r.value)) continue;
      await client.query(`UPDATE tenant_configs SET value = $1 WHERE tenant_id = $2 AND key = $3`, [
        encrypt(r.value),
        r.tenant_id,
        r.key,
      ]);
      n++;
    }
    console.log(`  tenant_configs (secrets): encrypted ${n} row(s)`);
  } catch (e) {
    console.warn(`  tenant_configs: skipped (${e.message})`);
  }

  await client.end();
  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
