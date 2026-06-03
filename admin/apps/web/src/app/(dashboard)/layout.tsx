import { auth } from '@/auth';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/topbar';
import { getVenue } from '@/lib/queries';
import { db, tables } from '@hyperglow/db';
import { eq, sql } from 'drizzle-orm';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [venue, session] = await Promise.all([getVenue(), auth()]);

  if (!venue) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-muted">
        No venue configured. Run <code className="bg-surface2 px-2 py-0.5 rounded mx-1">pnpm db:seed</code>.
      </div>
    );
  }

  const [{ count: tableCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tables)
    .where(eq(tables.venueId, venue.id));

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        venueName={venue.name}
        tableCount={tableCount ?? 0}
        userName={session?.user?.name ?? 'Admin'}
        userRole={(session?.user as { role?: string })?.role === 'admin' ? 'Operations Director' : 'Manager'}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar venueId={venue.id} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
