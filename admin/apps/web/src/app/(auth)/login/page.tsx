import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import { googleEnabled } from '@/auth';
import { GoogleButton } from '../_components/google-button';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

async function loginFormAction(formData: FormData) {
  'use server';
  const callbackUrl = (formData.get('callbackUrl') as string) || `${BASE_PATH}/overview`;
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`${BASE_PATH}/login?error=invalid&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; registered?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? `${BASE_PATH}/overview`;

  return (
    <>
      {params.registered ? (
        <div className="card mb-4 bg-oliveSoft border-olive/30 text-olive text-sm">
          Account created. Sign in below.
        </div>
      ) : null}
      {params.reset ? (
        <div className="card mb-4 bg-oliveSoft border-olive/30 text-olive text-sm">
          Password updated. Sign in with your new password.
        </div>
      ) : null}

      <form action={loginFormAction} className="card space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            autoFocus
            defaultValue="anton@tavola.test"
            className="mt-1 w-full px-3 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted">Password</span>
            <Link href="/forgot" className="text-xs text-terraFg hover:text-terra">
              Forgot password?
            </Link>
          </div>
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full px-3 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
          />
        </label>

        {params.error ? <p className="text-sm text-red">Invalid email or password.</p> : null}

        <button
          type="submit"
          className="w-full bg-ink text-bg py-2 rounded font-medium hover:bg-text transition-colors"
        >
          Sign in
        </button>

        {googleEnabled ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="flex-1 border-t border-border" />
              or
              <span className="flex-1 border-t border-border" />
            </div>
            <GoogleButton label="Continue with Google" />
          </>
        ) : null}
      </form>

      <p className="text-center text-sm text-muted mt-4">
        Don&rsquo;t have an account?{' '}
        <Link href="/register" className="text-terraFg hover:text-terra font-medium">
          Create one
        </Link>
      </p>
      <p className="text-xs text-muted text-center mt-3">
        Seed login: <span className="font-mono">anton@tavola.test</span> /{' '}
        <span className="font-mono">tavola</span>
      </p>
    </>
  );
}
