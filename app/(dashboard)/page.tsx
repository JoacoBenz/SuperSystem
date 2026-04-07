import { getServerSession } from '@/src/core/auth/session';
import { redirect } from 'next/navigation';
import { DashboardContent } from './DashboardContent';

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return <DashboardContent orgRole={session.orgRole} permissions={session.permissions} />;
}
