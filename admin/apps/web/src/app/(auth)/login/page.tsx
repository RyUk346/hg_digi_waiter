import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { signIn } from '@/auth';
import { googleEnabled } from '@/auth';
import { GoogleButton } from '../_components/google-button';
import { PasswordInput } from '@/components/password-input';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

type LoginErrorCode =
  | 'EmailNotFound'
  | 'WrongPassword'
  | 'GoogleAccount'
  | 'InvalidEmail'
  | 'CredentialsSignin'
  | 'invalid';

const ERROR_MESSAGES: Record<LoginErrorCode, { field: 'email' | 'password' | null; message: string }> = {
  EmailNotFound: {
    field: 'email',
    message: 'No account found with that email. Create one to get started.',
  },
  WrongPassword: {
    field: 'password',
    message: 'Incorrect password. Try again or use “Forgot password?”',
  },
  GoogleAccount: {
    field: 'email',
    message: 'This account uses Google sign-in. Use the “Continue with Google” button below.',
  },
  InvalidEmail: {
    field: 'email',
    message: 'That doesn’t look like a valid email.',
  },
  CredentialsSignin: { field: null, message: 'Sign-in failed. Please try again.' },
  invalid: { field: null, message: 'Email or password is incorrect.' }, // legacy fallback
};

async function loginFormAction(formData: FormData) {
  'use server';
  const callbackUrl = (formData.get('callbackUrl') as string) || `${BASE_PATH}/overview`;
  const email = formData.get('email') as string;
  try {
    await signIn('credentials', {
      email,
      password: formData.get('password'),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // Auth.js surfaces the custom CredentialsSignin code on err.code
      const code = (err as { code?: string }).code ?? 'CredentialsSignin';
      const params = new URLSearchParams({
        error: code,
        callbackUrl,
      });
      if (email) params.set('lastEmail', email);
      redirect(`${BASE_PATH}/login?${params.toString()}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    registered?: string;
    reset?: string;
    lastEmail?: string;
  }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? `${BASE_PATH}/overview`;
  const errorCode = (params.error as LoginErrorCode | undefined) ?? null;
  const error = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.CredentialsSignin : null;

  return (
    <>
      {params.registered ? (
        <Banner tone="success">
          <CheckCircle2 size={16} strokeWidth={2} />
          Account created. Sign in below.
        </Banner>
      ) : null}
      {params.reset ? (
        <Banner tone="success">
          <CheckCircle2 size={16} strokeWidth={2} />
          Password updated. Sign in with your new password.
        </Banner>
      ) : null}

      {error ? (
        <Banner tone="error">
          <AlertCircle size={16} strokeWidth={2} />
          {error.message}
        </Banner>
      ) : null}

      <form action={loginFormAction} className="card space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            autoFocus={error?.field !== 'password'}
            defaultValue={params.lastEmail ?? 'anton@tavola.test'}
            className={[
              'mt-1 w-full px-3 py-2 bg-surface2 border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30',
              error?.field === 'email' ? 'border-red ring-2 ring-red/30' : 'border-border',
            ].join(' ')}
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted">Password</span>
            <Link href="/forgot" className="text-xs text-terraFg hover:text-terra">
              Forgot password?
            </Link>
          </div>
          <div className="mt-1">
            <PasswordInput
              name="password"
              required
              autoComplete="current-password"
              autoFocus={error?.field === 'password'}
              className={[
                'w-full pl-3 pr-10 py-2 bg-surface2 border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30',
                error?.field === 'password' ? 'border-red ring-2 ring-red/30' : 'border-border',
              ].join(' ')}
            />
          </div>
        </label>

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
    </>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'success'
      ? 'bg-oliveSoft border-olive/30 text-olive'
      : 'bg-red/10 border-red/30 text-red';
  return (
    <div className={`mb-4 px-3 py-2.5 rounded border text-sm flex items-start gap-2 ${cls}`}>
      {children}
    </div>
  );
}
