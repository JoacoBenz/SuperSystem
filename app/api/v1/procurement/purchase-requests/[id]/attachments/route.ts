import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { getStorage } from '@/src/core/storage';

export const GET = withAuth(
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_all', 'procurement.purchase_request.read_department'] },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);
    const attachments = await ctx.db.fileAttachment.findMany({
      where: { resourceType: 'purchase_request', resourceId: prId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return ok(attachments.map(a => ({ ...a, fileSize: a.fileSize ? Number(a.fileSize) : null })));
  },
);

export const POST = withAuth(
  // Writing PR documents requires a procurement write capability, not mere read.
  { moduleId: 'procurement', permissionsAny: ['procurement.quotation.manage', 'procurement.purchase_request.create', 'procurement.purchase_request.update_own'] },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);

    const pr = await ctx.db.purchaseRequest.findUnique({ where: { id: prId } });
    if (!pr || pr.deletedAt) throw new ApiError('NOT_FOUND', 'Purchase request not found', 404);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new ApiError('BAD_REQUEST', 'No file provided', 400);
    if (file.size > 20 * 1024 * 1024) throw new ApiError('BAD_REQUEST', 'File too large (max 20 MB)', 400);
    // Only accept document/image types; reject executables, html, svg (XSS), etc.
    const ALLOWED_MIME = new Set([
      'application/pdf',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (!ALLOWED_MIME.has(file.type)) {
      throw new ApiError('BAD_REQUEST', `Unsupported file type: ${file.type || 'unknown'}`, 400);
    }

    const storage = getStorage();
    const saved = await storage.save(ctx.session.tenantId, 'purchase_request', prId, file);

    const attachment = await ctx.db.fileAttachment.create({
      data: {
        tenantId: ctx.session.tenantId,
        moduleId: 'procurement',
        resourceType: 'purchase_request',
        resourceId: prId,
        fileName: saved.fileName,
        filePath: saved.filePath,
        fileSize: BigInt(saved.fileSize),
        mimeType: saved.mimeType,
        uploadedBy: ctx.session.userId,
      } as any,
    });

    return ok({ ...attachment, fileSize: attachment.fileSize ? Number(attachment.fileSize) : null });
  },
);
