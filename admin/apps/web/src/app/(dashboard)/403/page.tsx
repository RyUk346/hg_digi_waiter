import Link from 'next/link';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { getCurrentUser, roleLabel } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function ForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1 min-w-0 flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red/10 text-red mb-4">
          <ShieldX size={28} strokeWidth={1.75} />
        </span>
        <h1 className="font-serif text-3xl text-ink">Not allowed</h1>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          Your account doesn&rsquo;t have permission to view this page.
        </p>
        {user ? (
          <p className="text-xs text-muted mt-4">
            Signed in as <span className="font-mono text-text">{user.email}</span> · role{' '}
            <span className="font-medium text-ink">{roleLabel(user.role)}</span>
          </p>
        ) : null}
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/overview"
            className="inline-flex items-center gap-1.5 bg-ink text-bg px-4 py-2 rounded text-sm font-medium hover:bg-text transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to dashboard
          </Link>
        </div>
        <p className="text-xs text-muted italic mt-6">
          If you need access, ask an admin to grant the relevant permission.
        </p>
      </div>
    </main>
  );
}
