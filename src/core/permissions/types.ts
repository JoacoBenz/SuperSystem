export interface PermissionDefinition {
  resource: string;
  action: string;
  description: string;
}

export interface RoleDefinition {
  name: string;
  displayName: string;
  permissions: string[];
}

export interface PermissionContext {
  userId: number;
  tenantId: number;
  departmentId: number | null;
  permissions: Set<string>;
  resource?: {
    ownerId?: number;
    departmentId?: number;
  };
}

export interface SegregationRule {
  id: string;
  description: string;
  conflictingActors: Array<{ field: string; label: string }>;
}
