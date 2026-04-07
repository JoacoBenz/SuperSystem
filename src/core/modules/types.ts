import type { PermissionDefinition, RoleDefinition } from '@/src/core/permissions/types';
import type { StateMachineConfig, TransitionConfig } from '@/src/core/state-machine/types';

export interface NavigationItem {
  key: string;
  label: string;
  icon: string;
  requiredPermissions: string[];
  badge?: {
    countEndpoint: string;
    permission: string;
  };
  children?: NavigationItem[];
}

export interface DashboardWidget {
  id: string;
  component: string;
  requiredPermissions: string[];
  defaultPosition: { col: number; row: number; width: number; height: number };
}

export interface WorkflowDefinition {
  id: string;
  resource: string;
  config: StateMachineConfig;
  transitions: TransitionConfig<any>[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  requiredPermissions: string[];
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  permissions: PermissionDefinition[];
  roles: RoleDefinition[];
  navigation: NavigationItem[];
  dashboardWidgets: DashboardWidget[];
  workflows: WorkflowDefinition[];
  reports: ReportDefinition[];
  onEnable?: (tenantId: number) => Promise<void>;
  onDisable?: (tenantId: number) => Promise<void>;
}
