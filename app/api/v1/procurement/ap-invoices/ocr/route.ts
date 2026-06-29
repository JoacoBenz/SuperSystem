import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { prisma } from '@/src/core/db/client';
import { getOcrProvider } from '@/src/core/providers/ocr';
import { z } from 'zod';

const p = prisma as any;

const ocrSchema = z.object({
  attachmentId: z.number().int().positive().optional(),
  text: z.string().optional(),
});

/**
 * Run OCR/document-understanding over a vendor document and return extracted AP-invoice
 * fields for the create form to pre-fill. Default provider is a stub → { configured:false }
 * (graceful manual fallback); the Anthropic provider activates when ANTHROPIC_API_KEY is set.
 */
export const POST = withAuth(
  { moduleId: 'procurement', permissions: ['procurement.invoice.manage'], body: ocrSchema },
  async (_request, ctx) => {
    const { attachmentId, text } = ctx.body;
    let input: { fileName?: string; mimeType?: string; text?: string } = { text };
    if (attachmentId) {
      const att = await p.fileAttachment.findFirst({
        where: { id: attachmentId, tenantId: ctx.session.tenantId, deletedAt: null },
        select: { fileName: true, mimeType: true },
      });
      if (att) input = { fileName: att.fileName, mimeType: att.mimeType, text };
    }
    const provider = await getOcrProvider(ctx.session.tenantId);
    const result = await provider.extract(input);
    return ok(result);
  },
);
