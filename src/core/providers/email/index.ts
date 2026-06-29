import { getTenantConfigValue } from '@/src/core/tenant/config';
import { logEmailProvider } from './log.provider';
import { resendEmailProvider } from './resend.provider';
import type { EmailMessage, EmailProvider } from './types';

export type { EmailMessage, EmailProvider } from './types';

/**
 * Resolve the tenant's email provider: tenant config `email_provider`, then the
 * EMAIL_PROVIDER env var, else `log`. Falls back to `log` if the chosen provider
 * isn't fully configured — so it never throws and is safe with nothing set up.
 */
export async function getEmailProvider(tenantId: number): Promise<EmailProvider> {
  let choice = 'log';
  try {
    choice = await getTenantConfigValue(tenantId, 'email_provider', process.env.EMAIL_PROVIDER ?? 'log');
  } catch {
    choice = 'log';
  }
  if (choice === 'resend' && process.env.RESEND_API_KEY) {
    return resendEmailProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM ?? 'noreply@erp.local');
  }
  return logEmailProvider;
}

/** Best-effort outbound email — resolves false on any failure, never throws. */
export async function sendEmail(tenantId: number, message: EmailMessage): Promise<boolean> {
  try {
    const provider = await getEmailProvider(tenantId);
    const result = await provider.send(message);
    return result.ok;
  } catch {
    return false;
  }
}
