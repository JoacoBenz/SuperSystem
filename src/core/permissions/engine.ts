import type { PermissionContext } from './types';

export class PermissionEngine {
  check(ctx: PermissionContext, requiredPermission: string): boolean {
    if (ctx.permissions.has(requiredPermission)) return true;

    const parts = requiredPermission.split('.');
    if (parts.length < 3) return false;
    const [moduleId, resource, action] = parts;

    // Wildcard: module admin
    if (ctx.permissions.has(`${moduleId}.*`)) return true;

    // Scope escalation for read permissions
    if (action === 'read_own') {
      if (ctx.permissions.has(`${moduleId}.${resource}.read_department`)) {
        return ctx.resource?.departmentId === ctx.departmentId;
      }
      if (ctx.permissions.has(`${moduleId}.${resource}.read_all`)) return true;
      return ctx.resource?.ownerId === ctx.userId;
    }

    if (action === 'read_department') {
      if (ctx.permissions.has(`${moduleId}.${resource}.read_all`)) return true;
      return ctx.resource?.departmentId === ctx.departmentId;
    }

    return false;
  }

  checkAll(ctx: PermissionContext, permissions: string[]): boolean {
    return permissions.every(p => this.check(ctx, p));
  }

  checkAny(ctx: PermissionContext, permissions: string[]): boolean {
    return permissions.some(p => this.check(ctx, p));
  }
}

export const permissionEngine = new PermissionEngine();
