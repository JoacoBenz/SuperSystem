export interface PayLinkRequest {
  invoiceNumber: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface PayLinkResult {
  url: string;
  provider: string;
  external: boolean; // true if it points at an external PSP checkout
}

export interface PaymentProvider {
  name: string;
  createPayLink(req: PayLinkRequest): Promise<PayLinkResult>;
}
