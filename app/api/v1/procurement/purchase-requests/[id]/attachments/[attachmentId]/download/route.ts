import { withAuth } from '@/src/core/api/handler';
import { ApiError } from '@/src/core/api/errors';
import { getStorage } from '@/src/core/storage';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_all', 'procurement.purchase_request.read_department'] },
  async (request, ctx) => {
    const attachmentId = parseInt(ctx.params.attachmentId);
    const attachment = await ctx.db.fileAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.deletedAt) throw new ApiError('NOT_FOUND', 'Attachment not found', 404);

    const storage = getStorage();
    const buffer = await storage.read(attachment.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': attachment.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
      },
    });
  },
);
