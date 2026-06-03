# HyperGlow Admin

Monorepo for the HyperGlow admin portal and shared packages. Built so the future device API (Order/Kitchen/Manager apps) plugs in as a sibling without re-wiring the data layer.

## Layout

```
admin/
├── apps/
│   ├── web/                 Next.js 15 admin portal (App Router, TS, Tailwind)
│   └── realtime/            Postgres LISTEN/NOTIFY → Socket.io bridge
├── packages/
│   └── db/                  Drizzle schema + migrations + seed + triggers (shared)
├── docs/
│   ├── SRS.md               Software Requirements Specification (v1.0 baseline)
│   └── SRS-STATUS.md        FR-level build status — what's done / partial / not started
├── docker-compose.yml       Postgres 16 for local dev
├── pnpm-workspace.yaml
└── package.json             Workspace root with convenience scripts
```

**Future:** when the React Native apps are ready to connect, add `apps/device-api/` (Express). It imports `@hyperglow/db` for the schema and uses `apps/realtime` for fan-out — no schema drift, no parallel WebSocket stack.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind v3 + custom HyperGlow design tokens |
| ORM | Drizzle |
| DB | Postgres 16 (Docker locally, your VPS in prod) |
| Auth | Auth.js v5 (NextAuth) + Drizzle adapter + bcrypt credentials |
| Charts | Recharts |
| Icons | lucide-react |
| Validation | Zod |
| Package manager | pnpm 9 workspaces |

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker Desktop (for local Postgres)

## First-time setup

From `D:\HyperGlow\DigitalWaiter\admin\`:

```bash
# 1. Install everything
pnpm install

# 2. Copy env files
cp .env.example packages/db/.env
cp apps/web/.env.example apps/web/.env.local
# Then generate a real AUTH_SECRET (powershell): [Convert]::ToBase64String((1..32 | %{Get-Random -Maximum 256}))
# Put it in apps/web/.env.local

# 3. Start Postgres
pnpm db:up

# 4. Generate + apply migrations
pnpm db:generate
pnpm db:migrate

# 5. Seed the Tavola demo data
pnpm db:seed
#  → Creates Tavola Soho venue, 12 tables, 5 servers, full menu with build sequences,
#    4 games, 14 days of synthesised orders/payments/game-plays, sample alerts and audit log.
#    Admin login: anton@tavola.test / tavola

# 6. Install Postgres triggers (LISTEN/NOTIFY → realtime bridge)
pnpm db:triggers

# 7. Copy realtime env (uses the same DATABASE_URL as packages/db)
Copy-Item apps\realtime\.env.example apps\realtime\.env

# 8. Run both services (web on :3000, realtime on :3001)
pnpm dev
```

## Daily commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run **both** admin web (:3000) and realtime bridge (:3001) in parallel |
| `pnpm dev:web` | Web only |
| `pnpm dev:realtime` | Realtime bridge only |
| `pnpm db:triggers` | (Re)install Postgres LISTEN/NOTIFY triggers on hot tables |
| `pnpm db:up` / `pnpm db:down` | Start/stop Postgres container |
| `pnpm db:logs` | Tail Postgres logs |
| `pnpm db:studio` | Drizzle Studio (DB GUI at https://local.drizzle.studio) |
| `pnpm db:generate` | Generate a new migration after editing `packages/db/src/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev only — bypasses migrations) |
| `pnpm db:seed` | Wipe and re-seed Tavola demo data |
| `pnpm build` | Production build of the admin web app |
| `pnpm start` | Run the production build |

## Adding a new schema change

1. Edit `packages/db/src/schema.ts`
2. `pnpm db:generate` — drizzle-kit writes a SQL migration into `packages/db/drizzle/`
3. `pnpm db:migrate` — applies it locally
4. Commit both the schema change *and* the generated SQL file
5. On the VPS, run `pnpm db:migrate` against prod DATABASE_URL

## Adding a new admin page

1. Create `apps/web/src/app/(dashboard)/your-page/page.tsx`
2. Add it to the sidebar in `apps/web/src/components/sidebar.tsx`
3. Server components can `import { db, … } from '@hyperglow/db'` and query directly — no API layer needed for the admin portal
4. For mutations, use Server Actions (see `apps/web/src/app/actions/auth-actions.ts` for the pattern)

## Realtime architecture

The Postgres → web pipeline is already in place:

```
┌─────────────────┐  INSERT/UPDATE/DELETE
│  Postgres       │ ─────────────────────► trigger ─► NOTIFY hyperglow_events
│  (orders, etc.) │
└─────────────────┘
         │ LISTEN
         ▼
┌─────────────────┐
│ apps/realtime   │  Socket.io server :3001
│ (Node, postgres)│
└─────────┬───────┘
          │ emit('change', {table, op, id, venueId})
          ▼
┌─────────────────────────────────────────┐
│ apps/web  <LiveRefresh/> client cmp     │
│  on event → debounced router.refresh()  │
│           → server components re-render │
│           → live KPIs without polling   │
└─────────────────────────────────────────┘
```

Watched tables: `orders`, `order_lines`, `payments`, `game_plays`, `alerts`, `menu_items`, `audit_log`. Add more by editing `packages/db/src/triggers.ts` and re-running `pnpm db:triggers`.

Latency is sub-second when everything's local. The debounce on the web side (1.5s) prevents thrashing during bursty writes.

## How the future device API will connect

The plan is `apps/device-api/` — a Node/Express service importing `@hyperglow/db`.

- **Reads**: same Drizzle queries the admin uses
- **Writes**: events from Order/Kitchen/Manager apps land in Postgres
- **Realtime fan-out**: free — they're already Postgres-trigger driven. The device API doesn't need to publish anything; just write to the DB and `apps/realtime` broadcasts.
- **Cross-app workflows** (e.g., KDS publishing `ALL_DELIVERED` closing the games window on the guest tablet) work by:
  1. Kitchen app marks last `order_line.bumped_at`
  2. Trigger fires NOTIFY
  3. Order app subscribed to `venue:{id}` room gets the event
  4. Order app's local state machine transitions the tablet from `waiting` to `eating`

The admin portal already reads from these tables, so the dashboards reflect device activity with **no admin code changes** once devices come online.

## Deploying to your VPS

Quick path (single-server, behind nginx or Caddy):

```bash
# On the VPS, one-time:
sudo apt install postgresql-16
sudo -u postgres createuser hyperglow -P
sudo -u postgres createdb -O hyperglow hyperglow

# Clone the repo, then:
pnpm install --prod=false
pnpm build
pnpm --filter @hyperglow/db migrate

# Use pm2 or systemd to keep the Next.js server running:
pm2 start "pnpm --filter @hyperglow/web start" --name hyperglow-admin
```

Reverse-proxy `admin.yourdomain.com → :3000` with Caddy or nginx + Let's Encrypt.

**Postgres in production:** bind to `127.0.0.1` only in `postgresql.conf`. Never expose port 5432 to the internet. Run `pgBackRest` or `pg_dump | rclone copy` nightly to off-server storage.

## Design system — terracotta discipline

`#B8543D` (`bg-terra` / `text-terraFg` / `bg-terraSoft`) is reserved for **HyperGlow-monetised surfaces only**. In this codebase that means:

- Upsell revenue KPIs
- Games revenue + 80/20 split bar
- Top upsells table revenue column
- Server upsell-rate column
- The "Games" sidebar item (the only nav entry tinted terracotta)

Never use it for generic CTAs. The Tailwind utility classes are named explicitly (`bg-terra`, `bg-terraSoft`) so the discipline is visible in code review.

## What's stubbed vs real

| Page | Status |
|---|---|
| `/login` | Real — Auth.js Credentials |
| `/overview` | Real — live KPIs from Postgres |
| `/revenue` | Real — 30-day stacked series |
| `/menu` | Real — read-only DB view (CRUD TODO) |
| `/servers` | Real — week leaderboard from `server_shifts` |
| `/games` | Real — 30-day game-play stats |
| `/alerts` | Real — open alerts from `alerts` table |
| `/compliance` | Real — audit log viewer |
| `/settings` | Real — read-only venue + user info |

Mutations (menu CRUD, alert resolve, settings edit, server CRUD) are not yet wired — they're the obvious next step. The Drizzle schema already supports them.
