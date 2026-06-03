# Auth setup — Google OAuth + Gmail SMTP

The admin portal supports three sign-in paths:

- **Email + password** (always on)
- **Google OAuth** (optional; hidden if not configured)
- **Forgot / reset password** via email (graceful fallback if SMTP not configured)

This doc walks through the two external configs needed: a Google OAuth client, and a Gmail App Password for sending email.

---

## 1. Gmail App Password (for password-reset and welcome emails)

You'll send emails from a Gmail account using SMTP. Gmail requires an **App Password** — a 16-character code separate from the account password. Regular Gmail passwords don't work over SMTP if 2FA is enabled.

### Steps

1. **Enable 2-Step Verification** on the Gmail account you'll send from:
   https://myaccount.google.com/security → 2-Step Verification → On

2. **Generate an App Password:**
   https://myaccount.google.com/apppasswords
   - App name: `HyperGlow Admin` (any name — for your reference)
   - Click **Create**
   - Copy the 16-character password Google shows (spaces don't matter — paste as-is or strip them)

3. **Set env vars** in `apps/web/.env.local`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=youraccount@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop      # the App Password
   SMTP_FROM=youraccount@gmail.com    # what the recipient sees in "From"
   APP_NAME=HyperGlow Admin
   ```

4. Restart the dev server. Outgoing email now goes through Gmail.

### Limits to be aware of

- Gmail SMTP rate-limits to **~500 emails / day** per account.
- Gmail may flag the account as "suspicious" if you send a sudden burst from a new IP. Test small first.
- For real production, swap to a transactional provider (Resend, AWS SES, Mailgun) by setting different SMTP_HOST/PORT/USER/PASS values — the code doesn't care, it's generic SMTP.

### Without SMTP

If `SMTP_USER` and `SMTP_PASS` are blank, emails are **logged to the server console** instead of sent. You'll see the password-reset link in the `pnpm dev` output, paste it into the browser, and the flow works end-to-end without a real inbox. Useful for local dev.

---

## 2. Google OAuth client (for "Continue with Google" button)

### Steps

1. **Create or pick a Google Cloud project:**
   https://console.cloud.google.com/projectcreate

2. **Configure the OAuth consent screen** (one-time, per project):
   https://console.cloud.google.com/apis/credentials/consent
   - User type: **External** (unless you have a Google Workspace org)
   - App name: `HyperGlow Admin`
   - User support email: your email
   - Developer contact: your email
   - Scopes: leave default (email + profile)
   - Test users: add the Google accounts you want to allow during development

3. **Create OAuth credentials:**
   https://console.cloud.google.com/apis/credentials
   - **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `HyperGlow Admin Web`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (for local dev)
     - `https://location.hyperglow.co.uk` (or whatever your prod host is)
   - **Authorized redirect URIs** — this is the critical bit:
     - `http://localhost:3000/api/auth/callback/google` (local)
     - `https://location.hyperglow.co.uk/SoftPOS/Test/api/auth/callback/google` (prod, including basePath)
   - Click **Create**, copy the Client ID and Client Secret

4. **Set env vars** in `apps/web/.env.local`:

   ```env
   GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

5. Restart the dev server. The "Continue with Google" button appears on `/login` and `/register`.

### How the redirect URI works

Auth.js handles Google OAuth at the route `/api/auth/callback/google`. With basePath set, Next.js serves it at `<basePath>/api/auth/callback/google`. Whatever you put in `AUTH_URL`, the callback URI is `AUTH_URL/api/auth/callback/google`. Make sure that exact string is in the Google Cloud "Authorized redirect URIs" list — it must match character-for-character.

Common mistake: forgetting `/SoftPOS/Test` in the production redirect URI. Symptom: `redirect_uri_mismatch` error on Google's consent screen. Fix: add the basePath-prefixed URI to the list.

### Hiding the button

If `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` aren't set, Auth.js doesn't load the provider, and the "Continue with Google" button is hidden from the login/register pages automatically. No code change needed to disable Google.

---

## 3. Registration policy

Current implementation:

- **Public registration** is enabled. Anyone with the URL can create an account at `/register`.
- **New users get `admin` role** with access to the first venue (Tavola Soho if seeded).
- **Email auto-verified.** No verification link sent at signup. (A welcome email is sent if SMTP is configured.)

To tighten this for production, either:

1. **Disable `/register`** by deleting `apps/web/src/app/(auth)/register/page.tsx` and removing the "Create one" link from `/login`. Users would be invited via the `/settings?tab=users` UI (which is currently a stub).

2. **Change default role.** In `apps/web/src/app/actions/auth-actions.ts`, in `registerAction`, change `role: 'admin'` to `role: 'staff'` or `role: 'manager'`. New accounts will sign in but won't have access to most features until promoted.

3. **Add email verification.** Generate a token at signup, send a verification email, gate login on `emailVerified IS NOT NULL`. Not implemented in this pass; ~30 minutes of work.

---

## 4. Quick reference — full env block

```env
# .env.local — production VPS values

DATABASE_URL=postgres://hyperglow:STRONG_PASS@127.0.0.1:5432/hyperglow

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://location.hyperglow.co.uk/SoftPOS/Test

GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=app-password-here
SMTP_FROM=alerts@yourdomain.com
APP_NAME=HyperGlow Admin

NEXT_PUBLIC_BASE_PATH=/SoftPOS/Test
NEXT_PUBLIC_REALTIME_URL=
```
