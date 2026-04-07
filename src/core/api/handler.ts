import { type ZodSchema } from 'zod';
import { getServerSession } from '@/src/core/auth/session';
import { tenantPrisma, type TenantDB } from '@/src/core/db/tenant-client';
import { moduleRegistry } from '@/src/core/modules/registry';
import { AuditService } from '@/src/core/audit/service';
import { apiError, ApiError } from './errors';
import { logger } from '@/src/core/logger';
import type { SessionUser } from '@/src/shared/types/common';

export interface HandlerContext<TBody = unknown> {
  session: SessionUser;
  db: TenantDB;
  ip: string;
  audit: AuditService;
  body: TBody;
  params: Record<string, string>;
  query: URLSearchParams;
}

export interface HandlerOptions<TBody = unknown> {
  permissions?: string[];
  permissionsAny?: string[];
  body?: ZodSchema<TBody>;
  moduleId?: string;
  auditAction?: string;
  auditResource?: string;
}

function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

export function withAuth<TBody = unknown>(
  options: HandlerOptions<TBody>,
  handler: (request: Request, ctx: HandlerContext<TBody>) => Promise<Response>,
) {
  return async (request: Request, routeParams?: { params: Promise<Record<string, string>> }) => {
    try {
      // 1. Authenticate
      const session = await getServerSession();
      if (!session) {
        return apiError('UNAUTHORIZED', 'Authentication required', 401);
      }

      const isSuperAdmin = session.orgRole === 'super_admin';
      const userPermissions = new Set(session.permissions);

      // 2. Check module enabled (super_admin bypasses)
      if (options.moduleId && !isSuperAdmin) {
        const enabled = await moduleRegistry.isModuleEnabled(session.tenantId, options.moduleId);
        if (!enabled) {
          return apiError('MODULE_DISABLED', 'This module is not enabled for your organization', 403);
        }
      }

      // 3. Check permissions (super_admin bypasses all permission checks)
      if (!isSuperAdmin) {
        if (options.permissions?.length) {
          const allMatch = options.permissions.every(p => userPermissions.has(p));
          if (!allMatch) {
            return apiError('FORBIDDEN', 'Insufficient permissions', 403);
          }
        }
        if (options.permissionsAny?.length) {
          const anyMatch = options.permissionsAny.some(p => userPermissions.has(p));
          if (!anyMatch) {
            return apiError('FORBIDDEN', 'Insufficient permissions', 403);
          }
        }
      }

      // 4. Parse + validate body
      let body: TBody = undefined as TBody;
      if (options.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const rawBody = await request.json().catch(() => null);
        if (!rawBody) {
          return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
        }
        const result = options.body.safeParse(rawBody);
        if (!result.success) {
          const details = result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          }));
          return apiError('VALIDATION_ERROR', 'Validation failed', 422, details);
        }
        body = result.data;
      }

      // 5. Build context
      const ip = getClientIp(request);
      const params = routeParams?.params ? await routeParams.params : {};
      const query = new URL(request.url).searchParams;

      // Super_admin can query any tenant via ?tenant_id=X
      let effectiveTenantId = session.tenantId;
      if (isSuperAdmin && query.has('tenant_id')) {
        effectiveTenantId = parseInt(query.get('tenant_id')!, 10);
      }
      const db = tenantPrisma(effectiveTenantId);
      const audit = new AuditService(
        session.tenantId,
        session.userId,
        ip,
        request.headers.get('user-agent') ?? undefined,
      );

      const ctx: HandlerContext<TBody> = { session, db, ip, audit, body, params, query };

      // 6. Execute handler
      const response = await handler(request, ctx);

      // 7. Auto-audit on success
      if (options.auditAction && response.ok) {
        audit.log({
          action: options.auditAction,
          resource: options.auditResource ?? 'unknown',
          moduleId: options.moduleId,
        }).catch(() => {}); // fire and forget
      }

      return response;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        return apiError(error.code, error.message, error.status, error.details);
      }

      logger.error('api', 'unhandled_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: request.url,
        method: request.method,
      });

      return apiError('INTERNAL', 'Internal server error', 500);
    }
  };
}
