'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type RegisterState } from '@/app/actions/auth-actions';
import { GoogleButton } from '../_components/google-button';
import { PasswordInput } from '@/components/password-input';

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, { ok: true });
  const errors = state.ok ? {} : state.errors;
  const values = state.ok ? null : state.values;
  const v = (k: string, fallback = '') => values?.[k] ?? fallback;

  return (
    <>
      <form action={formAction} className="card space-y-4">
        <h2 className="font-serif text-xl text-ink">Create your account</h2>

        {errors._ ? <p className="text-sm text-red">{errors._}</p> : null}

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Name</span>
          <input
            name="name"
            required
            autoFocus
            defaultValue={v('name')}
            className="mt-1 w-full px-3 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
          />
          {errors.name ? <p className="text-xs text-red mt-1">{errors.name}</p> : null}
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={v('email')}
            className="mt-1 w-full px-3 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
          />
          {errors.email ? <p className="text-xs text-red mt-1">{errors.email}</p> : null}
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Password</span>
          <div className="mt-1">
            <PasswordInput name="password" required minLength={8} autoComplete="new-password" />
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>

        {googleEnabled ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="flex-1 border-t border-border" />
              or
              <span className="flex-1 border-t border-border" />
            </div>
            <GoogleButton label="Sign up with Google" />
          </>
        ) : null}
      </form>

      <p className="text-center text-sm text-muted mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-terraFg hover:text-terra font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}
