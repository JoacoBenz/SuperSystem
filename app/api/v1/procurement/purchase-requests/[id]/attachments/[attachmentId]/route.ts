import { withAuth } from '@/src/core/api/handler';
import { noContent } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { getStorage } from '@/src/core/storage';

export const DELETE = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.quotation.manage', 'procurement.purchase_request.create', 'procurement.purchase_request.update_own'] },
  async (request, ctx) => {
    const attachmentId = parseInt(ctx.params.attachmentId);
    const attachment = await ctx.db.fileAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.deletedAt) throw new ApiError('NOT_FOUND', 'Attachment not found', 404);

    await ctx.db.fileAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
    const storage = getStorage();
    await storage.delete(attachment.filePath);
    return noContent();
  },
);
