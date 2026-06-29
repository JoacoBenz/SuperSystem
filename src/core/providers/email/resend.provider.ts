import type { EmailProvider } from './types';

/**
 * Resend (resend.com) via its HTTP API — no SDK dependency, just `fetch`.
 * Activated only when RESEND_API_KEY is present (see ./index.ts). Never throws.
 */
export function resendEmailProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: 'resend',
    async send(message) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: message.to, subject: message.subject, html: message.html, text: message.text }),
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, provider: 'resend' };
        const data = await res.json().catch(() => ({}));
        return { ok: true, id: (data as { id?: string }).id, provider: 'resend' };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e), provider: 'resend' };
      }
    },
  };
}
