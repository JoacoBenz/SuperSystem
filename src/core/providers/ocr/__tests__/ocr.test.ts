import { describe, it, expect, vi } from 'vitest';
// tax/index transitively imports tenant/config → db client (which builds a pg Pool at
// import). Stub it so this pure-logic test doesn't need a DATABASE_URL.
vi.mock('@/src/core/db/client', () => ({ prisma: {} }));
import { stubOcrProvider } from '../stub.provider';
import { noopTaxProvider } from '../../tax';

describe('ocr + tax provider stubs', () => {
  it('stub OCR returns not-configured (graceful manual fallback, never throws)', async () => {
    const r = await stubOcrProvider.extract({ fileName: 'bill.pdf' });
    expect(r.configured).toBe(false);
    expect(r.note).toBeTruthy();
  });

  it('noop tax provider reports not-submitted', async () => {
    const r = await noopTaxProvider.submit({ invoiceNumber: 'INV-1', total: 100, currency: 'USD' });
    expect(r.submitted).toBe(false);
    expect(r.provider).toBe('noop');
  });
});
