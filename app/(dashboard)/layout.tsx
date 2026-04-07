import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/core/auth/session';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <DashboardShell
      userName={session.name}
      orgRole={session.orgRole}
    >
      {children}
    </DashboardShell>
  );
}
