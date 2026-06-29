import { prisma } from './client';

const TENANT_MODELS = [
  'user', 'department', 'tenantConfig', 'tenantModule', 'invitationCode',
  'auditLog', 'notification', 'fileAttachment', 'savedReportFilter',
  'vendor', 'costCenter', 'purchaseRequest', 'purchaseRequestItem',
  'purchaseRequestComment', 'purchaseOrder', 'reception', 'receptionItem',
  'stockEntry',
  'stockAdjustment',
  'quotation',
  'delegation',
  'budget',
  'aRInvoice', 'aRInvoiceLine', 'aPInvoice', 'aPInvoiceLine', 'payment',
  'postingException',
] as const;

export function tenantPrisma(tenantId: number) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = await query(args);
          if (result && isMultiTenantModel(model) && 'tenantId' in result && result.tenantId !== tenantId) {
            return null;
          }
          return result;
        },
        async create({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            (args.data as Record<string, unknown>).tenantId = tenantId;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId } as typeof args.where;
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId } as typeof args.where;
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
      },
    },
  });
}

function isMultiTenantModel(model: string): boolean {
  const modelLower = model.charAt(0).toLowerCase() + model.slice(1);
  return (TENANT_MODELS as readonly string[]).includes(modelLower);
}

export type TenantDB = ReturnType<typeof tenantPrisma>;
