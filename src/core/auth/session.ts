import { auth } from './auth.config';
import type { SessionUser, OrgRole } from '@/src/shared/types/common';

export async function getServerSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as Record<string, unknown>;

  return {
    userId: user.userId as number,
    tenantId: user.tenantId as number,
    name: user.name as string ?? '',
    email: user.email as string ?? '',
    orgRole: (user.orgRole as OrgRole) ?? 'member',
    departmentId: (user.departmentId as number) ?? null,
    departmentName: (user.departmentName as string) ?? null,
    permissions: (user.permissions as string[]) ?? [],
  };
}
