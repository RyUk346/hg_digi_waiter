'use server';

import { randomBytes, createHash } from 'node:crypto';
import { db, users, verificationTokens, venues } from '@hyperglow/db';
import { and, eq, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { passwordResetEmail, sendEmail, welcomeEmail } from '@/lib/email';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// Strip the Auth.js path suffix if AUTH_URL contains it. The reset-email URL
// needs to point at /<basePath>/reset/<token>, not /<basePath>/api/auth/reset/<token>.
const APP_URL = (process.env.AUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000')
  .replace(/\/api\/auth\/?$/, '');

// ─── Login ────────────────────────────────────────────────────────────────

export async function loginAction(_prev: unknown, formData: FormData) {
  const callbackUrl = (formData.get('callbackUrl') as string) || `${BASE_PATH}/overview`;
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    throw err;
  }
  // Unreachable — signIn redirects.
  return { ok: true };
}

export async function googleLoginAction() {
  await signIn('google', { redirectTo: `${BASE_PATH}/overview` });
}

export async function logoutAction() {
  await signOut({ redirectTo: `${BASE_PATH}/login` });
}

// ─── Registration ────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export type RegisterState =
  | { ok: true }
  | { ok: false; errors: Record<string, string>; values: Record<string, string> };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors, values: raw };
  }

  const { name, email, password } = parsed.data;

  // Check if email already exists
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return {
      ok: false,
      errors: { email: 'An account with this email already exists. Try signing in instead.' },
      values: raw,
    };
  }

  // Multi-tenant policy: every new user owns their OWN venue. Data isolation
  // is enforced by every query filtering on session.user.venueId.
  const slugBase = email.split('@')[0]?.replace(/[^a-z0-9-]/gi, '').toLowerCase() ?? 'user';
  const slug = `${slugBase}-${randomBytes(3).toString('hex')}`;
  const [newVenue] = await db
    .insert(venues)
    .values({
      name: `${name}'s Restaurant`,
      slug,
      timezone: 'Europe/London',
      currency: 'GBP',
      recoveryBudgetPence: 20000,
    })
    .returning({ id: venues.id });

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: 'admin',
    venueId: newVenue?.id,
    emailVerified: new Date(),
  });

  // Welcome email (fire-and-forget; failure shouldn't block signup)
  try {
    const { html, text } = welcomeEmail({ name });
    await sendEmail({ to: email, subject: `Welcome to HyperGlow`, html, text });
  } catch (err) {
    console.error('[register] welcome email failed', err);
  }

  // Auto-sign-in
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: `${BASE_PATH}/overview`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // Should not happen since we just created the user, but fall back to login page
      redirect(`${BASE_PATH}/login?registered=1`);
    }
    throw err;
  }
  return { ok: true };
}

// ─── Forgot password ─────────────────────────────────────────────────────

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESET_TOKEN_PREFIX = 'pwreset:'; // namespace inside verification_tokens

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
});

export type ForgotState =
  | { ok: true; sent: true }
  | { ok: false; error: string };

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = forgotSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid email' };
  }
  const { email } = parsed.data;

  // Always respond identically — don't leak whether the email exists (FR-AUTH-009).
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Clear any prior reset tokens for this email (so old links can't be reused)
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, `${RESET_TOKEN_PREFIX}${email}`));

    await db.insert(verificationTokens).values({
      identifier: `${RESET_TOKEN_PREFIX}${email}`,
      token: tokenHash,
      expires,
    });

    const resetUrl = `${APP_URL}/reset/${rawToken}?email=${encodeURIComponent(email)}`;
    try {
      const { html, text } = passwordResetEmail({ resetUrl, email });
      await sendEmail({
        to: email,
        subject: 'Reset your HyperGlow password',
        html,
        text,
      });
    } catch (err) {
      console.error('[forgot] email send failed', err);
      // Don't expose the failure — same response to the user either way.
    }
  }

  return { ok: true, sent: true };
}

// ─── Reset password ──────────────────────────────────────────────────────

const resetSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export type ResetState =
  | { ok: true }
  | { ok: false; errors: Record<string, string>; values: Record<string, string> };

export async function resetPasswordAction(
  token: string,
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors, values: raw };
  }

  const { email, password } = parsed.data;
  const tokenHash = hashToken(token);

  // Verify token: matches the hash for this email and hasn't expired
  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, `${RESET_TOKEN_PREFIX}${email}`),
        eq(verificationTokens.token, tokenHash),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      ok: false,
      errors: { _: 'This reset link is invalid or has expired. Request a new one.' },
      values: raw,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.email, email));

  // Burn the token so it can't be re-used
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, `${RESET_TOKEN_PREFIX}${email}`));

  // Auto-sign-in with the new password
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: `${BASE_PATH}/overview`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`${BASE_PATH}/login?reset=1`);
    }
    throw err;
  }
  return { ok: true };
}
