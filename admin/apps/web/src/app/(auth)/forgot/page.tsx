'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction, type ForgotState } from '@/app/actions/auth-actions';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPage() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordResetAction,
    { ok: false, error: '' },
  );
  const sent = state.ok && (state as { sent?: boolean }).sent;

  return (
    <>
      {sent ? (
        <div className="card text-center">
          <CheckCircle2 size={32} className="mx-auto text-olive mb-3" strokeWidth={1.75} />
          <h2 className="font-serif text-xl text-ink">Check your email</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            If an account exists with that email, a reset link is on its way. The link expires in 30 minutes.
          </p>
          <p className="text-xs text-muted italic mt-4">
            Not seeing it? Check spam, or{' '}
            <Link href="/forgot" className="text-terraFg hover:text-terra">
              try again
            </Link>
            .
          </p>
        </div>
      ) : (
        <form action={formAction} className="card space-y-4">
          <h2 className="font-serif text-xl text-ink">Forgot your password?</h2>
          <p className="text-sm text-muted">
            Enter your email and we&rsquo;ll send you a link to set a new one.
          </p>

          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Email</span>
            <input
              name="email"
              type="email"
              required
              autoFocus
              className="mt-1 w-full px-3 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
            />
          </label>

          {!state.ok && state.error ? <p className="text-sm text-red">{state.error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-bg py-2 rounded font-medium hover:bg-text transition-colors disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-muted mt-4">
        <Link href="/login" className="text-terraFg hover:text-terra font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
