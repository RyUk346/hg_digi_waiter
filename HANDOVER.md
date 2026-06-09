# HyperGlow Platform — Project Handover

> **Read this file first.** It is the entry point for any new developer or Claude session. Deeper specs and runbooks live under `admin/docs/`.

**Last updated:** 2026-06-04 (post-RBAC, post-production-deploy)

---

## 0. TL;DR

HyperGlow is a tabletop-tablet restaurant SaaS. Four apps:

| App | Audience | State |
|---|---|---|
| **Admin portal** (`admin/`) | Head office (browser) | ✅ Built and deployed |
| **Order App** (`tabletop-app/`) | Guests at the table | 🚧 Partial RN scaffold; not wired to admin DB yet |
| **Kitchen App** | Chefs | ❌ Not started in this repo |
| **Manager App** | Floor manager | ❌ Not started in this repo |

The **admin portal** is the thing actively under development. It's live at:

```
Local dev:  http://localhost:3000
Production: https://location.hyperglow.co.uk/SoftPOS/Test
GitHub:     https://github.com/RyUk346/hg_digi_waiter
VPS path:   /var/www/location/hg_digi_waiter/admin
```

Seed login: `anton@tavola.test` / `tavola`.

---

## 1. Product Overview

**HyperGlow** eliminates the traditional waiter workflow by letting guests order, pay, and entertain themselves from a tablet at their table. Two investor angles:

1. **Revenue uplift via behavioural upsell sequencing** (15–30% AOV uplift via build sequences, cross-sells, drinks-during-wait, games)
2. **Cost reduction via at-table self-service** (fewer floor staff, payment processed at the table)

**Tavola** is the fictional Italian bistro demo client. Tavola Soho is the primary venue. Manager: **Anton Joseph** (Operations Director on admin portal, Floor Manager on the manager app).

**Investor one-liner:** "A self-service tabletop ordering platform that drives revenue uplift via behavioural upsell sequencing and reduces operating costs by routing orders directly to the kitchen and processing payment at the table."

---

## 2. The Four Apps

| App | Audience | Platform | Resolution | Status (June 2026) |
|---|---|---|---|---|
| **Admin Portal** | Head office | React web (Next.js 15) | 1920×1080 desktop | ✅ Live in production at `https://location.hyperglow.co.uk/SoftPOS/Test` |
| **Order App** | Guest tablet | React Native Android | 800×1200 portrait | Partial RN scaffold in `tabletop-app/`. Diverges from spec (uses Zustand + react-navigation + NativeWind). Not connected to admin DB. |
| **Kitchen App** | Chefs (KDS) | React Native Android | 1920×1080 landscape | Not in this repo. Designed in HTML demo only. |
| **Manager App** | Floor manager tablet | React Native Android | 1200×800 landscape | Not in this repo. Designed in HTML demo only. |

---

## 3. Repository Layout

```
D:\HyperGlow\DigitalWaiter\
├── HANDOVER.md                  (this file — read first)
├── .gitignore
├── .git/                        (private GitHub repo)
│
├── admin/                       (the active build — pnpm monorepo)
│   ├── apps/
│   │   ├── web/                 Next.js 15 admin portal
│   │   └── realtime/            Socket.io bridge for Postgres LISTEN/NOTIFY (not deployed to VPS yet)
│   ├── packages/
│   │   └── db/                  Drizzle schema + migrations + seed + triggers
│   ├── docs/
│   │   ├── SRS.md               Full Software Requirements Spec
│   │   ├── SRS-STATUS.md        FR-by-FR build status (Done / Partial / Not started)
│   │   └── AUTH-SETUP.md        Gmail / IONOS SMTP + Google OAuth walkthrough
│   ├── docker-compose.yml       Postgres 16 for local dev
│   ├── ecosystem.config.cjs     pm2 production process config
│   ├── pnpm-workspace.yaml
│   ├── package.json             Workspace root with convenience scripts
│   └── README.md                Local setup + daily commands
│
├── tabletop-app/                (Order App RN project — diverged from spec)
│
├── designs/                     (design references)
└── reference/                   (HTML demos, etc.)
```

The **admin/** monorepo is what's actively built. **tabletop-app/** is a partial scaffold from before this work; it's not wired to the admin's database yet.

---

## 4. Admin Portal — Tech Stack (as built)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript strict, Tailwind v3 |
| Database | self-hosted Postgres 16 (Docker locally, native install on VPS) |
| ORM | Drizzle (`drizzle-orm` + `drizzle-kit`) |
| Auth | Auth.js v5 (next-auth@5 beta) + Drizzle adapter + bcrypt credentials + Google OAuth |
| Email | nodemailer (IONOS SMTP in prod, console-log in dev when not configured) |
| Images | custom Sharp-based optimizer at `/api/img/[...path]` (Next's built-in optimizer breaks with basePath) |
| Charts | Recharts |
| Icons | lucide-react |
| Validation | Zod |
| Package manager | pnpm 9 workspaces |
| Process manager (prod) | pm2 + `ecosystem.config.cjs` |
| Reverse proxy (prod) | nginx — sub-path under `/SoftPOS/Test/` |

### Why these and not the SRS's defaults

The SRS §2.4 lists Auth0/Supabase Auth and ClickHouse/Redis as options. We went self-hosted because Anton already has a VPS and didn't want monthly bills for managed services. Specifically:

- Auth.js v5 instead of Auth0 → self-hosted, no monthly cost
- Postgres only (no Redis, no ClickHouse) → single-server simplicity
- pm2 + nginx instead of AWS ECS → matches the VPS he already pays for

Trade-off: NFR-REL-001 (99.9% uptime) and NFR-REL-006 (multi-AZ) are not achievable on a single VPS. Reconcile when scaling.

---

## 5. Admin Portal — Routes Built

All routes live under `apps/web/src/app/`. Route groups in parentheses are organisational only — they don't affect URLs.

### Public auth routes — `(auth)/` group

| URL | What it does |
|---|---|
| `/login` | Email + password, optional Google button, forgot link, register link |
| `/register` | Name + email + password + confirm. Auto-creates user, signs in, redirects to dashboard. Public registration — new users get `role='admin'` and venue = first venue. |
| `/forgot` | Email-only form. Sends reset link with 30-min SHA-256-hashed token in `verification_tokens`. Always returns same response (anti-enumeration). |
| `/reset/[token]?email=…` | Set new password. Burns token on use. Auto-signs in. |

All four password fields have a **show/hide eye toggle** (`components/password-input.tsx`).

### Dashboard routes — `(dashboard)/` group (auth required)

| URL | What it does | Built? |
|---|---|---|
| `/overview` | 4-section dashboard: KPI strip (5 cards) → Revenue trend + HG Impact card → Games (split/plays/top) → Deep dives (top upsells, server leaderboard, activity feed) | ✅ |
| `/revenue` | 30d stacked area + per-category totals | 🟡 basic |
| `/games` | Catalogue + 30d revenue + per-game stats + 80/20 split | 🟡 basic |
| `/menu` | List with thumbnails + stock chips + edit/delete; archived view via `?view=archived`; add/edit dialog with build-sequence editor + image upload + category-create inline | ✅ full CRUD |
| `/menu/new` | Unified create form (basic info + build sequence) | ✅ |
| `/menu/[id]/edit` | Same form pre-populated; standalone stock toggle in header (fires its own action) | ✅ |
| `/servers` | Week leaderboard from `server_shifts` | 🟡 read-only |
| `/alerts` | Open alerts from `alerts` table | 🟡 read-only |
| `/compliance` | Status cards + allergen chains + filterable audit log + GDPR stub + regulatory export stub | 🟡 reads real, mutations stubbed |
| `/settings?tab=…` | Vertical tab nav; Venue tab fully wired with Server Action update; 8 other tabs are informative stubs | 🟡 Venue done |
| `/upsell` | Stub | ❌ |
| `/403` | Forbidden page (shows current role) | ✅ |

### API routes — `app/api/`

| URL | What it does |
|---|---|
| `/api/auth/[...nextauth]` | Auth.js handlers (login, logout, OAuth callbacks) |
| `/api/img/[...path]?w=&q=` | Sharp-based image optimizer. Reads from `public/uploads/`, resizes to allowed widths, reencodes to WebP/AVIF/JPEG based on Accept header. Path-traversal safe. Long-cache. |

### Middleware (`src/middleware.ts`)

basePath-aware. Bypasses `/api/`, `/uploads/`, `/_next/`, `/favicon.ico`. Otherwise:
- Logged-in users on `/login` → redirect to `/overview`
- Anon users on `/login` `/register` `/forgot` `/reset/*` → allow
- Anon users on any other → redirect to `/login?callbackUrl=…`

---

## 6. Authentication + Authorization

### Authentication (built)

- **Credentials provider** — bcrypt password hashes in `users.password_hash`
- **Google OAuth** — conditional based on `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env presence; button hidden if not configured
- **Session** — JWT strategy (not DB sessions)
- **JWT callback** hydrates `role` + `venueId` from DB on first sign-in
- **`createUser` event** — sets new OAuth users to `role='admin'` + first venue + email auto-verified

### Authorization (built) — 2 roles

| Role | Granted permissions |
|---|---|
| `admin` | All — full menu CRUD including delete, settings edit, compliance export, user management |
| `manager` | Reads everything except user management. Writes: menu (create/edit), stock toggle. **No**: delete menu items, edit settings, export compliance, manage users |
| `staff` | None (kept as enum value, no permissions assigned) |

### Files

- **`lib/permissions.ts`** — public surface, client-safe. `PERMISSIONS` constants, `Role` type, `ROLE_PERMISSIONS` map, `hasPermission()`, `roleLabel()`.
- **`lib/rbac.ts`** — `'server-only'`. Re-exports the public surface. Adds `getCurrentUser()`, `requirePermission()`, `requireVenueAccess()`.
- **`lib/http-errors.ts`** — `unauthorized()` (redirect to `/login`), `forbidden()` (redirect to `/403`). Both basePath-aware.

### Multi-venue (multi-branch)

Every user has `users.venue_id` pointing at one venue. `getVenue()` in `lib/queries.ts` returns the venue from `session.user.venueId`. All downstream queries filter by `venue.id`. Cross-venue access prevented by `requireVenueAccess(venueId)` (used in `updateVenue` action).

**Limitation:** No UI yet to manage roles / venue assignment. Use psql or Drizzle Studio:

```sql
UPDATE users SET role = 'manager' WHERE email = 'someone@example.com';
UPDATE users SET venue_id = (SELECT id FROM venues WHERE slug = 'tavola-soho') WHERE email = '...';
```

---

## 7. Database Schema

Full Drizzle schema at `admin/packages/db/src/schema.ts`. Tables (all venue-scoped except auth):

```
venues                  — single venue per row; slug, name, timezone, currency, recoveryBudgetPence
users                   — Auth.js compatible; passwordHash, role, venueId, emailVerified
accounts                — Auth.js OAuth account links
sessions                — Auth.js (unused; JWT strategy)
verification_tokens     — password reset tokens (SHA-256 hashed) + email verification

tables                  — physical tables per venue; current_phase enum
servers                 — staff per venue
server_shifts           — per-shift aggregates: covers, upsell_attempts, upsell_accepted, revenue

menu_categories         — per-venue categories with sort_order
menu_items              — sku, name, description, base_price_pence, station, tint, available,
                          cross_sell, allergens (jsonb), image_url, sort_order, deleted_at
build_steps             — per-item upsell sequence; question + subtitle + options (jsonb)
                          options shape: [{ id, label, description?, deltaPence, featured?, badge? }]

orders                  — venue/table/server, status, cover_count, subtotal, total, placed_at, closed_at
order_lines             — orderId, menuItemId, quantity, base_price, upsell_delta, line_price,
                          selections (jsonb), bumped_at
payments                — order/venue, amount, tip, method, status, stripePaymentIntentId, paid_at

games                   — slug, name, duration_seconds, price_pence, hyperglow_revenue_share_bps
game_plays              — venue/table/game, price_pence, hyperglow_share_bps, score, completed,
                          stripePaymentIntentId, played_at

alerts                  — venue/table, severity (enum), title, body, resolved_at
audit_log               — venue/actor/table, action (enum), amount_pence, details (jsonb), occurred_at
```

### Postgres triggers (`packages/db/src/triggers.ts`)

Watched tables (`orders`, `order_lines`, `payments`, `game_plays`, `alerts`, `menu_items`, `audit_log`) emit `NOTIFY hyperglow_events` on every INSERT/UPDATE/DELETE. The `apps/realtime` Socket.io service LISTENs and broadcasts to connected browsers. Currently **only used locally** — realtime not deployed to VPS.

### Migrations

Generated by drizzle-kit and committed under `packages/db/drizzle/`. Apply with `pnpm db:migrate`. The `deleted_at` column on `menu_items` was added in a later migration (soft-delete pattern).

---

## 8. Design System — TERRACOTTA DISCIPLINE

**Critical product rule** carried forward from the SRS:

> The terracotta accent `colors.terra` / `#B8543D` is reserved **exclusively** for HyperGlow-monetised surfaces.

Used in:
- Build-sequence upsell options (featured tiles)
- Cross-sell quick-add buttons
- Drink recommendations during wait
- Games pricing + leaderboard
- AOV uplift KPIs (Overview, Revenue)
- Top upsells card progress bars
- Server leaderboard #1 highlight
- "Powered by HyperGlow" tag in sidebar

Not used elsewhere. Black (`ink`) for commit actions, olive for success, red for critical, amber for warning.

### Tailwind tokens (configured in `apps/web/tailwind.config.ts`)

```
bg / surface / surface2 / surface3 / border / borderSoft
ink / text / muted / mutedSoft
terra / terraSoft / terraStrong / terraFg
olive / oliveSoft / amber / amberSoft / red / rose / blue / purple
sb.bg / sb.bg2 / sb.border / sb.text / sb.textMuted / sb.textSoft  (dark sidebar)
```

### Typography

- Display/serif: Fraunces (fallback Iowan Old Style / Georgia / Charter)
- Body/sans: DM Sans (fallback system)
- Mono: Menlo / ui-monospace

---

## 9. Key Product Decisions (carried from SRS)

### Dining phase state machine

Order App tablet cycles through: `pre_order → waiting → eating → paying`. Stored on `tables.current_phase`.

### Games window rule

Games available **only during waiting** (between order placed and last item bumped). Tighter window = more urgency to play = higher second-£2 conversion. Enforced on the Order App side (when device-api ships).

### Conservative countdown

Guest tablet shows KDS estimate + 2 min buffer. Sub-text: "First course in ~X minutes" where X = countdown − 4. Domino's principle.

### Three upsell vectors

1. Build sequence at order time (e.g. burger: double → meal → truffle aioli)
2. Cart cross-sells at review screen (2×2 grid)
3. Drinks during wait (bar-station only, stage-rotated)

### 80/20 games revenue split

Hard-coded business rule. HyperGlow takes 80%, venue takes 20%. Stored per-play as `game_plays.hyperglow_share_bps = 8000`. Surfaced transparently on `/games` and the Overview "Games revenue" card.

---

## 10. Production Deployment

### URLs

```
Domain:         hyperglow.co.uk (registered with IONOS, also email host)
Subdomain:      location.hyperglow.co.uk (other projects also live here)
Sub-path:       /SoftPOS/Test/  (HyperGlow admin)
Full:           https://location.hyperglow.co.uk/SoftPOS/Test
```

### VPS layout

```
/var/www/location/hg_digi_waiter/       <- repo clone
├── admin/                              <- monorepo
│   ├── apps/web/                       <- deployed app
│   ├── apps/realtime/                  <- NOT deployed (skipped for v1)
│   ├── packages/db/
│   └── ecosystem.config.cjs            <- pm2 reads this
└── (other folders not deployed)
```

Other projects share the VPS on different ports:
- `studio-plt` on port 3000
- `bru_cafe` on port 3002
- `wc-poller` background
- `hyperglow-admin` on port **3010**

### nginx config

Lives at `/etc/nginx/sites-available/location.hyperglow.co.uk`. The HyperGlow block (added inside the existing `server { listen 443 ssl }` block):

```nginx
location /SoftPOS/Test/ {
    proxy_pass http://127.0.0.1:3010;          # NO trailing slash — preserves path
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header X-Forwarded-Prefix /SoftPOS/Test;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    client_max_body_size 5m;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

**Don't use `handle_path` / `proxy_pass http://.../`** (trailing slash) — those strip the prefix. Next.js with basePath needs the full URL preserved.

### Postgres on VPS

Installed via PGDG repo (`postgresql-16` + `postgresql-contrib-16`). Bound to `127.0.0.1` only — never exposed publicly. Connection from app:

```
DATABASE_URL=postgres://hyperglow:<STRONG_PASS>@127.0.0.1:5432/hyperglow
```

Nightly backups via cron:

```
0 3 * * * pg_dump hyperglow | gzip > /var/backups/postgres/hyperglow-$(date +\%Y\%m\%d).sql.gz && find /var/backups/postgres -mtime +30 -delete
```

### Env vars in production (`apps/web/.env.local` on VPS)

```env
DATABASE_URL=postgres://hyperglow:<STRONG_PASS>@127.0.0.1:5432/hyperglow

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://location.hyperglow.co.uk/SoftPOS/Test
AUTH_TRUST_HOST=true                     # required behind nginx

GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# IONOS SMTP for password-reset / welcome emails
SMTP_HOST=smtp.ionos.co.uk
SMTP_PORT=465
SMTP_USER=hello@hyperglow.co.uk
SMTP_PASS=<mailbox password from IONOS control panel>
SMTP_FROM=hello@hyperglow.co.uk
APP_NAME=HyperGlow Admin

PORT=3010
NEXT_PUBLIC_BASE_PATH=/SoftPOS/Test
NEXT_PUBLIC_REALTIME_URL=               # empty — realtime not deployed
```

`AUTH_TRUST_HOST=true` is required behind nginx — without it, Auth.js v5 may construct OAuth redirect URIs from the internal upstream host (`127.0.0.1:3010`) instead of the public domain, causing Google `redirect_uri_mismatch`.

### Google Cloud OAuth client

**Authorized JavaScript origins:**
- `http://localhost:3000`
- `https://location.hyperglow.co.uk`

**Authorized redirect URIs:**
- `http://localhost:3000/api/auth/callback/google`
- `https://location.hyperglow.co.uk/SoftPOS/Test/api/auth/callback/google`

The redirect URI MUST include the basePath. Forgetting this is the #1 cause of `redirect_uri_mismatch`.

### pm2

Started via `ecosystem.config.cjs`:

```js
module.exports = {
  apps: [{
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
  }],
};
```

Auto-start on reboot via `pm2 startup` + `pm2 save`.

### Deploy loop

From local:

```powershell
cd D:\HyperGlow\DigitalWaiter
git add admin/
git commit -m "..."
git push
```

On VPS:

```bash
cd /var/www/location/hg_digi_waiter
git pull
cd admin
pnpm install                                       # only if package.json changed
NEXT_PUBLIC_BASE_PATH=/SoftPOS/Test pnpm build     # only if app code changed
pm2 reload hyperglow-admin
```

For env-only changes:

```bash
nano apps/web/.env.local
pm2 restart hyperglow-admin --update-env           # --update-env is the gotcha
```

---

## 11. Local Development

Prerequisites: Node 20+, pnpm 9+, Docker Desktop (for Postgres).

```powershell
cd D:\HyperGlow\DigitalWaiter\admin
pnpm install
pnpm db:up                                  # starts Postgres in Docker
pnpm db:generate
pnpm db:migrate
pnpm db:triggers                            # one-time
pnpm db:seed                                # populates Tavola demo data
pnpm dev                                    # web on :3000 + realtime on :3001
```

Open `http://localhost:3000`. Sign in with `anton@tavola.test` / `tavola`.

### Daily commands

| | |
|---|---|
| `pnpm dev` | both web + realtime |
| `pnpm dev:web` / `pnpm dev:realtime` | one or the other |
| `pnpm db:up` / `db:down` / `db:logs` | Docker Postgres lifecycle |
| `pnpm db:studio` | Drizzle Studio at https://local.drizzle.studio |
| `pnpm db:generate` | new migration after schema edit |
| `pnpm db:migrate` | apply pending migrations |
| `pnpm db:seed` | wipe + reseed Tavola data |
| `pnpm build` / `pnpm start` | production bundle (rare locally) |

### Local env (`apps/web/.env.local`)

```env
DATABASE_URL=postgres://hyperglow:hyperglow_dev@localhost:5432/hyperglow
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_REALTIME_URL=http://localhost:3001
# Leave NEXT_PUBLIC_BASE_PATH UNSET locally — app serves at /
# Leave GOOGLE_* unset to hide the Google button locally
# Leave SMTP_* unset to log emails to console (dev convenience)
```

---

## 12. What's Outstanding

Roughly tracked at `admin/docs/SRS-STATUS.md`. High-impact items:

### Wiring the device apps

- Order App (`tabletop-app/`) is a partial RN scaffold but **doesn't talk to the admin DB**. It needs:
  - The `apps/device-api/` Express service (not yet built)
  - The realtime layer enabled on VPS
  - DATABASE_URL pointing at the same Postgres
  - `upsell_events` table for per-step conversion tracking
- Kitchen App + Manager App — designed in HTML demos only, not in this repo.

### Auth / Security

- **MFA (FR-AUTH-003)** — not implemented
- **Account lockout** after failed attempts (FR-AUTH-008) — not implemented
- **HIBP password breach check** (FR-AUTH-005) — not implemented
- **Audit log entries for auth events** (FR-AUTH-007) — auth events not yet written to `audit_log`
- **Email verification at signup** — currently auto-verified; flow exists in schema but no UI
- **Postgres RLS (NFR-SEC-005)** — app-layer filtering only; no DB-level policies

### Admin UI

- **User management UI** (FR-SET-008) — must use psql/Drizzle Studio to change roles
- **Venue switching for multi-branch admins** — each user is tied to one venue; no UI to switch
- **Revenue page deep dives** (heatmap, day-of-week, forecast, period compare) — basic version only
- **Games page deep dives** (replay analysis, per-game tabs, payout PDF) — basic version only
- **Compliance**: GDPR request flow stub (no real `gdpr_requests` table), regulatory export stub (no HMAC signing)
- **Settings tabs 2–9** (hours, recovery budget detail, tax, payments, integrations, users, billing, notifications) — all read-only stubs
- **Build-sequence per-step conversion** — needs `upsell_events` instrumentation from Order App
- **Activity feed → SSE** — currently revalidate-on-event; not true streaming

### Production

- **Realtime layer** (`apps/realtime`) — not deployed to VPS. Browser sees "Offline" pill. Manual page refresh required to see new data.
- **CI/CD** — manual deploy loop. No GitHub Actions.
- **Off-server backups** — nightly `pg_dump` runs locally on VPS. Nothing rclones to S3/B2 yet. If VPS dies, backups die with it.
- **Multi-AZ / 99.9% uptime** (NFR-REL-001/006) — single VPS, can't satisfy.

---

## 13. Common Gotchas (and how we worked around them)

### basePath + Next.js Image optimizer

Default `/_next/image` returns 400 for local files when basePath is set. **Fix:** custom Sharp-based optimizer at `/api/img/[...path]` plus a custom loader at `src/lib/image-loader.ts`. Configured in `next.config.ts` with `images.loader = 'custom'`.

### basePath + middleware

`req.nextUrl.pathname` *includes* the basePath. `NextResponse.redirect()` does *not* auto-prepend it. Middleware uses `stripBase(p)` for matching and `withBase(p)` for constructing redirect URLs.

### basePath + bypass paths

Matcher regex doesn't see basePath-prefixed paths the way you'd expect. Bypass list (`/_next/`, `/api/`, `/uploads/`, `/favicon.ico`) is applied in middleware code (after stripping basePath), not in the matcher.

### `pm2` env not reloading

Editing `.env.local` then `pm2 restart` keeps the OLD env. Must use `pm2 restart hyperglow-admin --update-env`.

### `next start` hardcoded port

We previously had `"start": "next start -p 3000"` in `apps/web/package.json` — that hard-codes port 3000 (already used by studio-plt on VPS) and ignores `PORT` env. **Fixed:** changed to `"start": "next start"`. Now reads PORT from env.

### `server-only` import + client component

`lib/rbac.ts` had `import 'server-only'` but the sidebar (client) imported `PERMISSIONS` from it. Build failed. **Fixed:** split into `lib/permissions.ts` (client-safe constants/types) + `lib/rbac.ts` (server-only helpers).

### FK constraint on menu delete

`order_lines.menu_item_id` has `ON DELETE RESTRICT`. Direct delete fails when historical orders reference the item. **Fixed:** smart delete — hard-delete if no historical orders, else soft-delete (set `deleted_at`). Restore via `/menu?view=archived`.

### Auth.js `createUser` event picked wrong table

Was `db.select({ id: users.venueId }).from(users).limit(1)` — got the first user's venueId, not the first venue. Worked by accident. **Fixed:** queries `venues` table directly.

### `AUTH_TRUST_HOST=true` behind reverse proxy

Without this, Auth.js v5 may build OAuth redirect URIs from the internal upstream (`127.0.0.1:3010`). Causes `redirect_uri_mismatch` from Google. Always set on prod.

### Google OAuth redirect URI must include basePath

`https://location.hyperglow.co.uk/api/auth/callback/google` (without `/SoftPOS/Test`) is wrong. Must be `https://location.hyperglow.co.uk/SoftPOS/Test/api/auth/callback/google`. Same for any future provider.

### Trailing slash on `proxy_pass`

`proxy_pass http://127.0.0.1:3010/` (with trailing slash) strips the URL prefix before forwarding — fine for some apps but breaks basePath setups. **Use no trailing slash** to preserve the full URL.

---

## 14. Sample Data Reference

Generated by `packages/db/src/seed.ts`. 14 days of synthesised orders + payments + game plays. Highlights:

### Menu items with build sequences

- **Tavola burger** (£12, amber tint) — 3-step build (double / meal / aioli)
- **Pizza Margherita** (£14, rose tint) — 2-step build (size / burrata)
- **Truffle risotto** (£18) — no build
- **Ribeye 250g** (£28) — no build
- Plus starters, desserts, drinks

### Games

| Game | Duration | Price | Featured? |
|---|---|---|---|
| Italian trivia | 90s · 10Q | £2 | ✓ |
| Couple's quiz | 5 min · 8 prompts | £2 | |
| Italian word puzzles | 3 min | £2 | |
| Spot the difference | 2 min | £2 | |

All 80% HG / 20% venue. £2 per play. Charged separately via Stripe Terminal at game start (not yet wired).

### Servers (week leaderboard)

| Rank | Name | Upsell rate | Covers | Revenue |
|---|---|---|---|---|
| 1 | Sofia Ricci | 41% | 124 | £4,820 |
| 2 | Aisha Patel | 38% | 108 | £4,142 |
| 3 | Diego Romano | 34% | 96 | £3,664 |
| 4 | Mia Chen | 31% | 78 | £2,964 |
| 5 | Marcus Holloway | 22% | (coaching) | £2,484 |

Marcus gets a coaching alert (>15pp below team average).

---

## 15. Investor Demo Narrative

When showing this product, the four key beats:

1. **Upsell engine in action.** £12 burger → £18-22 via 3 build screens. The menu/edit page shows live conversion stats per item.
2. **Wait-time monetisation.** Drinks during wait + £2 pay-per-play games. 80/20 split surfaced on `/games`.
3. **AI sentiment alerts.** Table 7 silent 18min → manager → recovered. Demoed via the seeded alerts on `/alerts` and `/overview`.
4. **At-table payment + bill split.** Future Order App will handle. Foundations are in `payments` schema.

The **terracotta colour discipline** is the visual proof of the business model — every terracotta surface is a revenue surface.

---

## 16. Bootstrapping a Fresh Claude Session

Paste this as the first message to any new Claude session that picks up this project:

> I'm continuing work on the HyperGlow Tavola admin portal. Read these files in order before doing anything:
>
> 1. `HANDOVER.md` (this is the canonical project doc)
> 2. `admin/docs/SRS.md` (Software Requirements Spec)
> 3. `admin/docs/SRS-STATUS.md` (per-FR build status — what's done vs pending)
> 4. `admin/docs/AUTH-SETUP.md` (Google OAuth + IONOS SMTP walkthrough)
> 5. `admin/README.md` (local setup, daily commands)
>
> Stack: pnpm monorepo (Next.js 15 App Router + Drizzle ORM + self-hosted Postgres 16 + Auth.js v5 + Tailwind v3 + Sharp + Recharts + lucide-react). Deployed to a single VPS at `https://location.hyperglow.co.uk/SoftPOS/Test/` via nginx → pm2 → :3010, with `NEXT_PUBLIC_BASE_PATH=/SoftPOS/Test`. SMTP via IONOS, Google OAuth client configured. RBAC has two roles (admin + manager); each user belongs to one venue.
>
> The four-app vision (Order / Kitchen / Manager + Admin) is in HANDOVER §2. Only the Admin is built. The Order App scaffold in `tabletop-app/` is not wired up to the admin's database yet — it'll come together via a future `apps/device-api/` service when the device apps go live.
>
> **Critical product rule:** terracotta `#B8543D` is reserved for HyperGlow-monetised surfaces only (see HANDOVER §8).
>
> Tell me where things stand and ask what to work on next.

That single paste gives the new Claude full context within a minute.

---

## 17. Where the Original SRS Lives

The full Software Requirements Spec (12 functional modules, ~110 FRs) is at `admin/docs/SRS.md`. The matching build-status doc is at `admin/docs/SRS-STATUS.md` — it tracks every FR with one of `✅ Done / 🟡 Partial / ⬜ Not started / ❌ Conflicts with current decisions`.

When adding work, update both files:
1. Build the thing
2. Bump the corresponding row in SRS-STATUS.md to ✅ or 🟡

---

## 18. Change Log (of this handover doc)

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-05-19 | Anton + Claude (session draft) | Initial 4-app vision + tech stack decisions |
| 2.0 | 2026-06-04 | Anton + Claude | Major rewrite reflecting actual build: admin portal live, production deployment, auth + RBAC, IONOS SMTP, Google OAuth, deploy gotchas, fresh-Claude bootstrap |

---

**End of handover.** Anything missing? Edit and commit.
