import Link from 'next/link';
import { createHash } from 'node:crypto';
import { AlertTriangle } from 'lucide-react';
import { db, verificationTokens } from '@hyperglow/db';
import { and, eq, gt } from 'drizzle-orm';
import { ResetForm } from './reset-form';

const RESET_TOKEN_PREFIX = 'pwreset:';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

async function tokenIsValid(token: string, email: string): Promise<boolean> {
  if (!token || !email) return false;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ token: verificationTokens.token })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, `${RESET_TOKEN_PREFIX}${email.toLowerCase()}`),
        eq(verificationTokens.token, tokenHash),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);
  return !!row;
}

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { token } = await params;
  const { email = '' } = await searchParams;
  const valid = await tokenIsValid(token, email);

  if (!valid) return <ExpiredView />;
  return <ResetForm token={token} email={email} />;
}

function ExpiredView() {
  return (
    <>
      <div className="card text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red/10 text-red mb-3">
          <AlertTriangle size={24} strokeWidth={1.75} />
        </span>
        <h2 className="font-serif text-xl text-ink">Link expired or already used</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          This reset link is no longer valid. Reset links expire after 30 minutes and can only be used
          once.
        </p>
        <div className="mt-5 space-y-2">
          <Link
            href="/forgot"
            className="block w-full bg-ink text-bg py-2 rounded font-medium hover:bg-text transition-colors"
          >
            Request a new link
          </Link>
          <Link href="/login" className="block text-sm text-muted hover:text-ink py-2">
            Back to sign in
          </Link>
        </div>
      </div>
    </>
  );
}
