import { describe, it, expect, beforeAll } from 'vitest';
import { encryptField, decryptField, isEncrypted } from '../field-encryption';

beforeAll(() => {
  // 32-byte base64 key for the test run.
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('field-encryption', () => {
  it('round-trips a value', () => {
    const ct = encryptField('1234-5678-9012');
    expect(ct).not.toBe('1234-5678-9012');
    expect(isEncrypted(ct)).toBe(true);
    expect(decryptField(ct)).toBe('1234-5678-9012');
  });

  it('produces a different ciphertext each time (random IV) but same plaintext', () => {
    const a = encryptField('secret');
    const b = encryptField('secret');
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe('secret');
    expect(decryptField(b)).toBe('secret');
  });

  it('is idempotent — never double-encrypts', () => {
    const once = encryptField('x')!;
    expect(encryptField(once)).toBe(once);
  });

  it('passes through plaintext on decrypt (pre-encryption rows)', () => {
    expect(decryptField('plain-tax-id')).toBe('plain-tax-id');
  });

  it('handles null/empty', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField('')).toBe('');
    expect(decryptField(null)).toBeNull();
  });
});
