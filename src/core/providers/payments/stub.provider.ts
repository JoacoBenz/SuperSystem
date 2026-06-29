import type { PaymentProvider } from './types';

/** Default provider — a deterministic in-app placeholder link, offline-safe. */
export const stubPaymentProvider: PaymentProvider = {
  name: 'stub',
  async createPayLink(req) {
    const url = `/pay/${encodeURIComponent(req.invoiceNumber)}?amount=${encodeURIComponent(req.amount)}&currency=${encodeURIComponent(req.currency)}`;
    return { url, provider: 'stub', external: false };
  },
};
