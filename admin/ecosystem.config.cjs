/**
 * pm2 production process config.
 *
 * Run on the VPS from /var/www/location/hg_digi_waiter/admin:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save                        # snapshot so it restarts on reboot
 *
 * Env values here are the SOURCE OF TRUTH for the running process.
 * NEXT_PUBLIC_* must also be set during `pnpm build` (they're baked into
 * the client bundle at build time):
 *   NEXT_PUBLIC_BASE_PATH=/SoftPOS/Test pnpm build
 *
 * Secrets (DATABASE_URL, AUTH_SECRET, SMTP_PASS, GOOGLE_CLIENT_SECRET) stay in
 * apps/web/.env.local — Next.js loads that file automatically and we don't
 * want secrets in a git-tracked file.
 */
module.exports = {
  apps: [
    {
      name: 'hyperglow-admin',
      script: 'pnpm',
      args: '--filter @hyperglow/web start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        NEXT_PUBLIC_BASE_PATH: '/SoftPOS/Test',
      },
      max_memory_restart: '512M',
      autorestart: true,
    },
  ],
};
</content>
