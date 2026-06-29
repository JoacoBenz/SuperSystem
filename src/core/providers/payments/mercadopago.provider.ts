import type { PaymentProvider } from './types';

/**
 * Mercado Pago Checkout Pro via its HTTP API — no SDK dependency, just `fetch`.
 * Activated only when MERCADOPAGO_ACCESS_TOKEN is set (see ./index.ts).
 */
export function mercadoPagoProvider(accessToken: string): PaymentProvider {
  return {
    name: 'mercadopago',
    async createPayLink(req) {
      const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ title: req.description || req.invoiceNumber, quantity: 1, unit_price: req.amount, currency_id: req.currency }],
          external_reference: req.invoiceNumber,
        }),
      });
      if (!res.ok) throw new Error(`Mercado Pago HTTP ${res.status}`);
      const data = await res.json();
      return { url: data.init_point || data.sandbox_init_point, provider: 'mercadopago', external: true };
    },
  };
}
