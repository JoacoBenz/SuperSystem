import { withAuth } from '@/src/core/api/handler';
import { ok } from '@/src/core/api/response';
import { apiError } from '@/src/core/api/errors';
import { moduleRegistry } from '@/src/core/modules/registry';
import { prisma } from '@/src/core/db/client';
import { z } from 'zod';

export const GET = withAuth(
  {},
  async (request, ctx) => {
    const { query, session } = ctx;
    const type = query.get('type');

    if (type === 'navigation') {
      const nav = await moduleRegistry.getNavigation(
        session.tenantId,
        new Set(session.permissions),
      );
      return ok(nav);
    }

    if (type === 'widgets') {
      const widgets = await moduleRegistry.getDashboardWidgets(
        session.tenantId,
        new Set(session.permissions),
      );
      return ok(widgets);
    }

    // List all modules with enabled status
    const allModules = moduleRegistry.getAll();
    const isSuperAdmin = session.orgRole === 'super_admin';
    const effectiveTenantId = isSuperAdmin && query.has('tenant_id')
      ? parseInt(query.get('tenant_id')!, 10)
      : session.tenantId;
    const enabledIds = await moduleRegistry.getEnabledModuleIds(effectiveTenantId);

    const modules = allModules.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      version: m.version,
      enabled: enabledIds.has(m.id),
      dependencies: m.dependencies,
      permissionCount: m.permissions.length,
      roleCount: m.roles.length,
    }));

    return ok(modules);
  },
);

const toggleSchema = z.object({
  moduleId: z.string(),
  enabled: z.boolean(),
  tenantId: z.number().int().positive(),
});

export const PATCH = withAuth(
  { body: toggleSchema },
  async (request, ctx) => {
    if (ctx.session.orgRole !== 'super_admin') {
      return apiError('FORBIDDEN', 'Only super admins can toggle modules', 403);
    }

    const { moduleId, enabled, tenantId } = ctx.body;

    // Only allow toggling ready modules (version != 0.0.0)
    const mod = moduleRegistry.get(moduleId);
    if (!mod) return apiError('NOT_FOUND', 'Module not found', 404);
    if (mod.version === '0.0.0') return apiError('BAD_REQUEST', 'Cannot enable a planned module', 400);

    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      update: { enabled },
      create: { tenantId, moduleId, enabled },
    });

    await ctx.audit.log({
      action: enabled ? 'enable' : 'disable',
      resource: 'module',
      resourceId: moduleId,
      eventType: 'config',
      metadata: { tenantId, moduleId },
    });

    return ok({ moduleId, tenantId, enabled });
  },
);
