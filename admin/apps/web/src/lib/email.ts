import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Email service. Gmail SMTP is the default config; any SMTP works via env vars.
 * If SMTP_USER / SMTP_PASS aren't set, falls back to logging the email to
 * stdout so dev / staging can iterate on the flow without a real inbox.
 *
 * Gmail App Password setup:
 * 1. Enable 2FA on the Gmail account
 * 2. https://myaccount.google.com/apppasswords → create one for "Mail / Other"
 * 3. SMTP_USER=yourname@gmail.com  SMTP_PASS=<16-char app password>
 */

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '465');
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER ?? 'no-reply@hyperglow.local';
const APP_NAME = process.env.APP_NAME ?? 'HyperGlow Admin';

let cachedTransport: Transporter | null = null;

function transport(): Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // implicit TLS on 465, STARTTLS on 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cachedTransport;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const t = transport();
  if (!t) {
    console.log('\n─── EMAIL (no SMTP configured — printing instead) ───');
    console.log(`To:      ${to}`);
    console.log(`From:    ${APP_NAME} <${SMTP_FROM}>`);
    console.log(`Subject: ${subject}`);
    console.log('---');
    console.log(text);
    console.log('────────────────────────────────────────────────────\n');
    return;
  }
  await t.sendMail({
    from: `"${APP_NAME}" <${SMTP_FROM}>`,
    to,
    subject,
    text,
    html,
  });
}

// ─── Templates ─────────────────────────────────────────────────────────────

const EMAIL_BG = '#FBF7EE';
const EMAIL_INK = '#1A1715';
const EMAIL_TERRA = '#B8543D';

function shell(body: string): string {
  return `<!DOCTYPE html>
<html><body style="background:${EMAIL_BG};font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:${EMAIL_INK};margin:0;padding:32px 16px;">
<table align="center" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:12px;padding:32px;border:1px solid #E8E2D3;">
<tr><td>
  <p style="margin:0 0 24px;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:${EMAIL_TERRA};font-weight:500;">${APP_NAME}</p>
  ${body}
  <p style="margin-top:32px;padding-top:16px;border-top:1px solid #E8E2D3;font-size:11px;color:#7A7064;">
    Sent automatically — please don&rsquo;t reply.
  </p>
</td></tr>
</table>
</body></html>`;
}

export function passwordResetEmail({ resetUrl, email }: { resetUrl: string; email: string }) {
  const html = shell(`
    <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;color:${EMAIL_INK};">Reset your password</h1>
    <p style="font-size:14px;line-height:1.55;color:#42392F;margin:0 0 20px;">
      Someone requested a password reset for the account <strong>${email}</strong>. Click below to set a new password.
      The link expires in 30 minutes.
    </p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="background:${EMAIL_INK};color:${EMAIL_BG};padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;display:inline-block;">Reset password</a>
    </p>
    <p style="font-size:12px;color:#7A7064;margin:20px 0 0;">
      Or paste this URL into your browser:<br/>
      <a href="${resetUrl}" style="color:${EMAIL_TERRA};word-break:break-all;">${resetUrl}</a>
    </p>
    <p style="font-size:12px;color:#7A7064;margin:16px 0 0;">
      If you didn&rsquo;t request this, you can safely ignore this email.
    </p>
  `);
  const text = `Reset your password\n\nSomeone requested a password reset for ${email}.\nOpen this URL within 30 minutes to set a new password:\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;
  return { html, text };
}

export function welcomeEmail({ name }: { name: string }) {
  const safeName = name || 'there';
  const html = shell(`
    <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;color:${EMAIL_INK};">Welcome, ${safeName}</h1>
    <p style="font-size:14px;line-height:1.55;color:#42392F;margin:0 0 12px;">
      Your account is ready. You can sign in any time at the admin portal.
    </p>
  `);
  const text = `Welcome, ${safeName}\n\nYour account is ready. You can sign in any time at the admin portal.`;
  return { html, text };
}
