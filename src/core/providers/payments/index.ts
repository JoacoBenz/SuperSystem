import { getTenantConfigValue } from '@/src/core/tenant/config';
import { stubPaymentProvider } from './stub.provider';
import { mercadoPagoProvider } from './mercadopago.provider';
import type { PaymentProvider } from './types';

export type { PayLinkRequest, PayLinkResult, PaymentProvider } from './types';

/** Resolve the tenant payment provider: config `payment_provider` → env → `stub`. */
export async function getPaymentProvider(tenantId: number): Promise<PaymentProvider> {
  let choice = 'stub';
  try {
    choice = await getTenantConfigValue(tenantId, 'payment_provider', process.env.PAYMENT_PROVIDER ?? 'stub');
  } catch {
    choice = 'stub';
  }
  if (choice === 'mercadopago' && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return mercadoPagoProvider(process.env.MERCADOPAGO_ACCESS_TOKEN);
  }
  return stubPaymentProvider;
}
