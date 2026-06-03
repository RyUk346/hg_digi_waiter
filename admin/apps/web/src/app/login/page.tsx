import { signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

async function login(formData: FormData) {
  'use server';
  const callbackUrl = (formData.get('callbackUrl') as string) || '/overview';
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=invalid&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? '/overview';

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-serif text-ink">HyperGlow</h1>
          <p className="text-sm text-muted mt-1">Admin portal · Tavola Soho</p>
        </div>
        <form action={login} className="card space-y-4">
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
            <span className="text-xs uppercase tracking-wide text-muted">Password</span>
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
          <p className="text-xs text-muted text-center pt-2">
            Default seed: <span className="font-mono">anton@tavola.test</span> /{' '}
            <span className="font-mono">tavola</span>
          </p>
        </form>
      </div>
    </main>
  );
}
