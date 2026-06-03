# SRS Implementation Status

Tracks build progress against `SRS.md`. Updated as features ship.

**Status legend:** ✅ Done · 🟡 Partial · ⬜ Not started · ❌ Blocked / conflicts with current decisions

Last reviewed: 2026-05-19

## 4.1 Authentication & Authorization
| FR | Title | Status | Notes |
|---|---|---|---|
| AUTH-001 | User login | ✅ | Auth.js v5 credentials provider, bcrypt |
| AUTH-002 | SSO (SAML/OIDC) | ⬜ | Auth.js can add providers later |
| AUTH-003 | MFA / TOTP | ⬜ | Mandatory for Ops Director per spec |
| AUTH-004 | Session management | 🟡 | JWT strategy active; concurrent-session limit & idle timeout not enforced |
| AUTH-005 | Password policy | ⬜ | HIBP check & rotation not implemented |
| AUTH-006 | RBAC | 🟡 | Schema has `role` enum (admin/manager/staff); permissions matrix not enforced server-side |
| AUTH-007 | Auth audit log | 🟡 | `audit_log` table exists; auth events not yet written to it |
| AUTH-008 | Account lockout | ⬜ | |
| AUTH-009 | Password reset | ⬜ | |
| AUTH-010 | Logout | ✅ | Sidebar Sign-out → server action |

## 4.2 Dashboard
| FR | Title | Status | Notes |
|---|---|---|---|
| DASH-001 | KPI strip | 🟡 | 4 KPIs live; sentiment + projection not yet |
| DASH-002 | Live refresh (≤30s) | 🟡 | WebSocket plumbing scaffolded; client-side `router.refresh()` on event |
| DASH-003 | Date range selector | ⬜ | All views fixed to "today" / 14d / 30d |
| DASH-004 | Revenue trend chart | 🟡 | 14d stacked bar; spec wants 30d area |
| DASH-005 | HG impact card | ⬜ | Need baseline-AOV computation methodology |
| DASH-006 | Games revenue card | ✅ | 80/20 split visible on Overview + Games |
| DASH-007 | Top converting upsells | 🟡 | Top 5 by £ added; conversion rate column TODO |
| DASH-008 | Server leaderboard | ✅ | Week aggregate from `server_shifts` |
| DASH-009 | Activity feed | ⬜ | Alerts shown on Overview but not full activity stream |
| DASH-010 | Export PDF | ⬜ | |
| DASH-011 | Drill-through | ⬜ | |

## 4.8 Menu & Pricing
| FR | Title | Status | Notes |
|---|---|---|---|
| MENU-001 | Item CRUD | 🟡 | Create / read / update / delete done; soft-delete not yet |
| MENU-002 | Build sequence config | ⬜ | Schema (`build_steps`) exists; no editor UI |
| MENU-003 | Cross-sell config | 🟡 | `crossSell` flag editable on item form |
| MENU-004 | Price management | 🟡 | Inline edit; no scheduling or change-audit detail |
| MENU-005 | Allergen tagging | 🟡 | Free-text comma-separated; needs controlled vocabulary + 90-day review flag |
| MENU-006 | Item photos | ⬜ | `image_url` field exists; no upload UI |
| MENU-007 | Category management | ⬜ | Seed-only |
| MENU-008 | 86 toggle | 🟡 | `available` flag editable; no broadcast yet |
| MENU-009 | Versioning | ⬜ | |
| MENU-010 | Publish to apps | 🟡 | Realtime layer in progress |
| MENU-011 | Wait drinks menu | ⬜ | |
| MENU-012 | Wine pairing | ⬜ | |

## Other modules
| Module | Status | Notes |
|---|---|---|
| **4.3 Revenue** (REV) | 🟡 | Basic 30d stacked chart; no heatmap/dow/forecast/compare |
| **4.4 Games** (GAMES) | 🟡 | Catalogue + 30d revenue; no per-game drill, no payout PDF, no replay-rate breakdown |
| **4.5 Upsell** (UPSELL) | ⬜ | Conversion-by-option table needs `upsell_events` instrumentation from Order App |
| **4.6 Operations** (OPS) | ⬜ | Requires kitchen-app event stream |
| **4.7 Team** (TEAM) | 🟡 | Leaderboard live; CRUD/scheduling/coaching not started |
| **4.9 Compliance** (COMP) | 🟡 | Audit log viewer read-only; allergen chains / GDPR / export not started |
| **4.10 Settings** (SET) | 🟡 | Read-only venue/account; no edit, no billing, no user management |
| **4.11 Reports** (REPT) | ⬜ | |
| **4.12 Multi-site** (SITE) | ⬜ | Schema supports it (every row has `venueId`); no UI |

## Non-functional
| NFR | Status | Notes |
|---|---|---|
| Postgres RLS (NFR-SEC-005) | ⬜ | App-layer filtering only |
| HMAC-signed audit log (NFR-SEC-010) | ⬜ | |
| 99.9% uptime / multi-AZ (NFR-REL-001/006) | ❌ | Conflicts with single-VPS deployment plan; needs Phase-2 infra |
| ClickHouse analytics | ❌ | Conflicts with self-hosted Postgres-only plan |
| WCAG 2.1 AA (NFR-USE-001) | ⬜ | No accessibility audit yet |

## Stack deviations from SRS §2.4 / §2.6
| SRS says | We use | Reason |
|---|---|---|
| "Node or Python, engineering's choice" | Node + Next.js 15 + Drizzle | Anton's call; matches Vercel/SSR ergonomics |
| "Auth0 / Supabase Auth" | Auth.js v5 with credentials | Self-hosted, no monthly bill |
| "PostgreSQL 15+, Redis 7+, optionally ClickHouse" | Postgres 16 only | Single-VPS constraint |
| "Multi-AZ deployment for production" | Single VPS (current) | Solo operator; reconcile when scaling |
