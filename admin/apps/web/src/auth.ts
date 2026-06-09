import NextAuth, { type NextAuthConfig, CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens, venues } from '@hyperglow/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Custom credentials errors — Auth.js v5 surfaces the `code` field to the
// login page, which translates it to a user-friendly message.
class InvalidEmailError extends CredentialsSignin { code = 'InvalidEmail'; }
class EmailNotFoundError extends CredentialsSignin { code = 'EmailNotFound'; }
class WrongPasswordError extends CredentialsSignin { code = 'WrongPassword'; }
class GoogleAccountError extends CredentialsSignin { code = 'GoogleAccount'; }

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Conditionally include Google — only if the env vars are present. Otherwise
// Auth.js errors out at boot complaining about missing client ID.
const providers: NextAuthConfig['providers'] = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) throw new InvalidEmailError();
      const { email, password } = parsed.data;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      if (!user) throw new EmailNotFoundError();
      if (!user.passwordHash) throw new GoogleAccountError();
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new WrongPasswordError();
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
        venueId: user.venueId ?? undefined,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // First-time Google users land here. Default role 'admin' per the
      // public-registration policy chosen during setup. Tighten later via
      // /settings?tab=users when that UI ships.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Behind a reverse proxy at a custom path, trust the X-Forwarded-* headers.
  // Without this, Auth.js may construct callback URLs from the upstream host.
  trustHost: true,
  // Explicit cookie config: force path '/' on the PKCE + state + callback
  // cookies so they're sent on every request regardless of basePath. Default
  // is already '/' but documenting + locking it in defends against subtle
  // path-scoping issues that surface with custom AUTH_URL paths.
  cookies: {
    pkceCodeVerifier: {
      name: '__Secure-authjs.pkce.code_verifier',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
    state: {
      name: '__Secure-authjs.state',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 900 },
    },
    callbackUrl: {
      name: '__Secure-authjs.callback-url',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
    csrfToken: {
      name: '__Host-authjs.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'admin';
        token.venueId = (user as { venueId?: string }).venueId;
      }
      // On every JWT issue, hydrate role + venueId from DB for Google sign-ins
      // (which don't return our extended user shape from `authorize`).
      if (trigger === 'signIn' && token.email && !token.role) {
        const [row] = await db
          .select({ role: users.role, venueId: users.venueId, id: users.id })
          .from(users)
          .where(eq(users.email, token.email.toLowerCase()))
          .limit(1);
        if (row) {
          token.role = row.role;
          token.venueId = row.venueId ?? undefined;
          token.sub = row.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { venueId?: string }).venueId = token.venueId as string | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Newly-created users via Drizzle adapter (Google sign-ins).
      // Multi-tenant policy: each new user owns their OWN venue. Data isolation
      // is enforced by every query filtering on session.user.venueId.
      if (!user.id) return;

      const slugBase = (user.email ?? user.id)
        .split('@')[0]
        ?.replace(/[^a-z0-9-]/gi, '')
        .toLowerCase() ?? 'user';
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
      const [newVenue] = await db
        .insert(venues)
        .values({
          name: `${user.name ?? 'My'}'s Restaurant`,
          slug,
          timezone: 'Europe/London',
          currency: 'GBP',
          recoveryBudgetPence: 20000,
        })
        .returning({ id: venues.id });

      await db
        .update(users)
        .set({ role: 'admin', venueId: newVenue?.id, emailVerified: new Date() })
        .where(eq(users.id, user.id));

      // Welcome email — best-effort
      if (user.email) {
        try {
          const { welcomeEmail, sendEmail } = await import('@/lib/email');
          const { html, text } = welcomeEmail({ name: user.name ?? '' });
          await sendEmail({ to: user.email, subject: 'Welcome to HyperGlow', html, text });
        } catch (err) {
          console.error('[google-signup] welcome email failed', err);
        }
      }
    },
  },
});
