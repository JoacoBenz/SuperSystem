import { PrismaClient } from '@/app/generated/prisma/client';

const SOFT_DELETE_MODELS = [
  'User', 'Department', 'Tenant', 'FileAttachment',
  'Vendor', 'CostCenter', 'PurchaseRequest', 'PurchaseOrder',
] as const;

export function withSoftDelete(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isSoftDeleteModel(model) && !hasDeletedAtFilter(args.where)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isSoftDeleteModel(model) && !hasDeletedAtFilter(args.where)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = await query(args);
          if (result && isSoftDeleteModel(model) && 'deletedAt' in result && result.deletedAt !== null) {
            return null;
          }
          return result;
        },
      },
    },
  });
}

function isSoftDeleteModel(model: string): boolean {
  return (SOFT_DELETE_MODELS as readonly string[]).includes(model);
}

function hasDeletedAtFilter(where: Record<string, unknown> | undefined): boolean {
  if (!where) return false;
  return 'deletedAt' in where;
}
