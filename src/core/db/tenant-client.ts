import { prisma } from './client';
import { RLS_ENABLED } from './rls';

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
  // When RLS is enabled, run each operation inside a transaction that first binds
  // app.tenant_id (transaction-local), so the database enforces tenant isolation even
  // if a query forgets its where-filter. Batching set_config + the query in one
  // $transaction is required under transaction pooling. When RLS is off this is a
  // straight passthrough, so behaviour is unchanged.
  const scoped = <T>(run: () => Promise<T>): Promise<T> => {
    if (!RLS_ENABLED) return run();
    return (prisma.$transaction([
      prisma.$executeRawUnsafe("SELECT set_config('app.tenant_id', $1, true)", String(tenantId)),
      run() as unknown,
    ] as never) as Promise<unknown[]>).then((r) => r[1] as T);
  };

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return scoped(() => query(args));
        },
        async findFirst({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return scoped(() => query(args));
        },
        async findUnique({ model, args, query }) {
          const result = await scoped(() => query(args));
          if (result && isMultiTenantModel(model) && 'tenantId' in result && result.tenantId !== tenantId) {
            return null;
          }
          return result;
        },
        async create({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            (args.data as Record<string, unknown>).tenantId = tenantId;
          }
          return scoped(() => query(args));
        },
        async update({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId } as typeof args.where;
          }
          return scoped(() => query(args));
        },
        async updateMany({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return scoped(() => query(args));
        },
        async delete({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId } as typeof args.where;
          }
          return scoped(() => query(args));
        },
        async deleteMany({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return scoped(() => query(args));
        },
        async count({ model, args, query }) {
          if (isMultiTenantModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return scoped(() => query(args));
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
