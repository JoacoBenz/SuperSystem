export type OrgRole = 'super_admin' | 'admin' | 'member';

export const ORG_ROLES: OrgRole[] = ['super_admin', 'admin', 'member'];

export interface SessionUser {
  userId: number;
  tenantId: number;
  name: string;
  email: string;
  orgRole: OrgRole;
  departmentId: number | null;
  departmentName: string | null;
  permissions: string[];
}
