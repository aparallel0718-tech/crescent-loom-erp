import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';
import TopNav from '../../components/TopNav';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <TopNav role={session.user.role} name={session.user.name} />
      <main className="flex-1 p-6 md:p-8 bg-chalk">{children}</main>
    </div>
  );
}
