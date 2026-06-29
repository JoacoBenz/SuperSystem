import { getTenantConfigValue } from '@/src/core/tenant/config';

// E-invoicing / tax-authority abstraction (LatAm: AFIP / SAT / SII). Country-specific
// fiscal integrations plug in here; the default is a no-op so the wiring is ready without
// committing to one authority. Never throws.

export interface EInvoiceRequest {
  invoiceNumber: string;
  total: number;
  currency: string;
  taxId?: string;
}

export interface EInvoiceResult {
  submitted: boolean;
  authorityId?: string;
  provider: string;
  note?: string;
}

export interface TaxAuthorityProvider {
  name: string;
  submit(req: EInvoiceRequest): Promise<EInvoiceResult>;
}

export const noopTaxProvider: TaxAuthorityProvider = {
  name: 'noop',
  async submit() {
    return { submitted: false, provider: 'noop', note: 'E-invoicing not configured (country-specific integration is a follow-up).' };
  },
};

export async function getTaxAuthorityProvider(tenantId: number): Promise<TaxAuthorityProvider> {
  try {
    await getTenantConfigValue(tenantId, 'einvoice_provider', 'noop');
  } catch {
    /* default below */
  }
  return noopTaxProvider; // AFIP/SAT/SII impls resolve here once configured
}
