import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';
import TopNav from '../../components/TopNav';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

    return (
    <div className="min-h-screen bg-chalk">
      <TopNav role={session.user.role} name={session.user.name} />
      <main className="p-6 md:p-8">{children}</main>
    </div>
  );
}
