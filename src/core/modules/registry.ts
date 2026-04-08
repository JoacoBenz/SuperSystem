import type { ModuleDefinition, NavigationItem, DashboardWidget, ReportDefinition } from './types';
import type { PermissionDefinition } from '@/src/core/permissions/types';
import { prisma } from '@/src/core/db/client';
import { cached } from '@/src/core/cache';

class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>();

  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module "${module.id}" is already registered`);
    }
    for (const dep of module.dependencies) {
      if (!this.modules.has(dep)) {
        throw new Error(`Module "${module.id}" depends on "${dep}" which is not registered`);
      }
    }
    this.modules.set(module.id, module);
  }

  get(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId);
  }

  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  async getEnabledModuleIds(tenantId: number): Promise<Set<string>> {
    const cacheKey = `t:${tenantId}:enabled_modules`;
    const ids = await cached(cacheKey, 60_000, async () => {
      const rows = await prisma.tenantModule.findMany({
        where: { tenantId, enabled: true },
        select: { moduleId: true },
      });
      return rows.map(r => r.moduleId);
    });
    return new Set(ids);
  }

  async isModuleEnabled(tenantId: number, moduleId: string): Promise<boolean> {
    const enabled = await this.getEnabledModuleIds(tenantId);
    return enabled.has(moduleId);
  }

  async getNavigation(
    tenantId: number,
    userPermissions: Set<string>,
    options?: { skipPermissionCheck?: boolean },
  ): Promise<NavigationItem[]> {
    const enabledIds = await this.getEnabledModuleIds(tenantId);
    const items: NavigationItem[] = [];

    for (const [id, mod] of this.modules) {
      if (!enabledIds.has(id)) continue;
      for (const nav of mod.navigation) {
        if (options?.skipPermissionCheck || nav.requiredPermissions.every(p => userPermissions.has(p))) {
          items.push(nav);
        }
      }
    }
    return items;
  }

  async getDashboardWidgets(
    tenantId: number,
    userPermissions: Set<string>,
  ): Promise<DashboardWidget[]> {
    const enabledIds = await this.getEnabledModuleIds(tenantId);
    const widgets: DashboardWidget[] = [];

    for (const [id, mod] of this.modules) {
      if (!enabledIds.has(id)) continue;
      for (const w of mod.dashboardWidgets) {
        if (w.requiredPermissions.every(p => userPermissions.has(p))) {
          widgets.push(w);
        }
      }
    }
    return widgets;
  }

  getAllPermissions(): Array<PermissionDefinition & { moduleId: string }> {
    const perms: Array<PermissionDefinition & { moduleId: string }> = [];
    for (const mod of this.modules.values()) {
      for (const p of mod.permissions) {
        perms.push({ ...p, moduleId: mod.id });
      }
    }
    return perms;
  }

  getAllReports(): ReportDefinition[] {
    return Array.from(this.modules.values()).flatMap(m => m.reports);
  }
}

export const moduleRegistry = new ModuleRegistry();
