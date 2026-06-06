import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens, venues } from '@hyperglow/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

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
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
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
      // Newly-created users (via the Drizzle adapter — i.e. Google sign-ins).
      // Default to admin role + first venue association. Public-registration policy.
      if (!user.id) return;
      // BUG FIX: was selecting from users table (random first user's venueId).
      // Should query venues directly so a fresh DB with no users still works.
      const [firstVenue] = await db.select({ id: venues.id }).from(venues).limit(1);
      await db
        .update(users)
        .set({ role: 'admin', venueId: firstVenue?.id, emailVerified: new Date() })
        .where(eq(users.id, user.id));
    },
  },
});
