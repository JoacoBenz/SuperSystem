import { describe, it, expect, vi } from 'vitest';
import { stubPaymentProvider } from '../stub.provider';
import { mercadoPagoProvider } from '../mercadopago.provider';

describe('payment providers', () => {
  it('stub provider returns a deterministic in-app link (offline)', async () => {
    const r = await stubPaymentProvider.createPayLink({ invoiceNumber: 'INV-7', amount: 100, currency: 'USD' });
    expect(r.provider).toBe('stub');
    expect(r.external).toBe(false);
    expect(r.url).toContain('INV-7');
    expect(r.url).toContain('amount=100');
  });

  it('mercadopago provider posts a preference and returns init_point', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ init_point: 'https://mp/checkout/abc' }) });
    vi.stubGlobal('fetch', fetchMock);
    const r = await mercadoPagoProvider('token').createPayLink({ invoiceNumber: 'INV-7', amount: 100, currency: 'ARS', description: 'X' });
    expect(r.url).toBe('https://mp/checkout/abc');
    expect(r.external).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api.mercadopago.com/checkout/preferences', expect.objectContaining({ method: 'POST' }));
    vi.unstubAllGlobals();
  });

  it('mercadopago provider throws on HTTP error (so the route maps it to 502)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(mercadoPagoProvider('token').createPayLink({ invoiceNumber: 'X', amount: 1, currency: 'USD' })).rejects.toThrow();
    vi.unstubAllGlobals();
  });
});
