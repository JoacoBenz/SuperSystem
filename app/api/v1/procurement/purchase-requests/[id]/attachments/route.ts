import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { ApiError } from '@/src/core/api/errors';
import { LocalStorageService } from '@/src/core/storage/local-storage.service';

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
  { moduleId: 'procurement', permissionsAny: ['procurement.purchase_request.read_own', 'procurement.purchase_request.read_all', 'procurement.purchase_request.read_department'] },
  async (request, ctx) => {
    const prId = parseInt(ctx.params.id);

    const pr = await ctx.db.purchaseRequest.findUnique({ where: { id: prId } });
    if (!pr || pr.deletedAt) throw new ApiError('NOT_FOUND', 'Purchase request not found', 404);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new ApiError('BAD_REQUEST', 'No file provided', 400);
    if (file.size > 20 * 1024 * 1024) throw new ApiError('BAD_REQUEST', 'File too large (max 20 MB)', 400);

    const storage = new LocalStorageService();
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
