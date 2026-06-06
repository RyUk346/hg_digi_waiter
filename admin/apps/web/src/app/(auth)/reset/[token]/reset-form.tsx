'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPasswordAction, type ResetState } from '@/app/actions/auth-actions';
import { PasswordInput } from '@/components/password-input';

export function ResetForm({ token, email }: { token: string; email: string }) {
  const bound = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(bound, { ok: true });
  const errors = state.ok ? {} : state.errors;
  const values = state.ok ? null : state.values;
  const emailValue = values?.email ?? email;

  return (
    <>
      <form action={formAction} className="card space-y-4">
        <h2 className="font-serif text-xl text-ink">Set a new password</h2>

        {errors._ ? (
          <div className="bg-red/10 border border-red/30 text-red text-sm px-3 py-2 rounded">
            {errors._}
            <p className="text-xs mt-1">
              <Link href="/forgot" className="text-red underline">
                Request a new reset link
              </Link>
            </p>
          </div>
        ) : null}

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            readOnly
            defaultValue={emailValue}
            className="mt-1 w-full px-3 py-2 bg-surface2 border border-border rounded text-text focus:outline-none cursor-not-allowed"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">New password</span>
          <div className="mt-1">
            <PasswordInput name="password" required minLength={8} autoFocus autoComplete="new-password" />
          </div>
          {errors.password ? <p className="text-xs text-red mt-1">{errors.password}</p> : null}
          <p className="text-xs text-muted italic mt-1">At least 8 characters.</p>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Confirm password</span>
          <div className="mt-1">
            <PasswordInput name="confirm" required minLength={8} autoComplete="new-password" />
          </div>
          {errors.confirm ? <p className="text-xs text-red mt-1">{errors.confirm}</p> : null}
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-ink text-bg py-2 rounded font-medium hover:bg-text transition-colors disabled:opacity-50"
        >
          {pending ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-4">
        <Link href="/login" className="text-terraFg hover:text-terra font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
