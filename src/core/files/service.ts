import { prisma } from '@/src/core/db/client';

export interface UploadFileInput {
  tenantId: number;
  moduleId?: string;
  resourceType: string;
  resourceId: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: number;
}

export async function createFileRecord(input: UploadFileInput) {
  return prisma.fileAttachment.create({
    data: {
      tenantId: input.tenantId,
      moduleId: input.moduleId ?? null,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      fileName: input.fileName,
      filePath: input.filePath,
      fileSize: input.fileSize ? BigInt(input.fileSize) : null,
      mimeType: input.mimeType ?? null,
      uploadedBy: input.uploadedBy,
    },
  });
}

export async function getFilesByResource(
  tenantId: number,
  resourceType: string,
  resourceId: number,
) {
  return prisma.fileAttachment.findMany({
    where: { tenantId, resourceType, resourceId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function softDeleteFile(id: number, tenantId: number) {
  return prisma.fileAttachment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
