import type { OcrProvider } from './types';

/**
 * Document understanding via the Anthropic Messages API — no SDK dependency, just `fetch`.
 * Activated only when ANTHROPIC_API_KEY is set (see ./index.ts). Never throws — returns a
 * note on failure so callers degrade to manual entry.
 */
export function anthropicOcrProvider(apiKey: string): OcrProvider {
  return {
    name: 'anthropic',
    async extract(input) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_OCR_MODEL || 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Extract the vendor name, invoice number, total, and line items (description, quantity, unitCost) from this vendor document. Respond with ONLY a JSON object {vendorName, invoiceNumber, total, lines:[{description,quantity,unitCost}]}.\n\n${input.text ?? input.fileName ?? ''}`,
            }],
          }),
        });
        if (!res.ok) return { configured: true, note: `OCR HTTP ${res.status}` };
        const data = await res.json();
        const txt: string = data?.content?.[0]?.text ?? '{}';
        const match = txt.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(match ? match[0] : '{}');
        return { configured: true, vendorName: parsed.vendorName, invoiceNumber: parsed.invoiceNumber, total: parsed.total, lines: parsed.lines };
      } catch (e) {
        return { configured: true, note: 'OCR error: ' + (e instanceof Error ? e.message : String(e)) };
      }
    },
  };
}
