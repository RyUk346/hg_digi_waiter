# Software Requirements Specification (SRS)
# Tavola Admin Portal — HyperGlow Platform

**Document version:** 1.0
**Status:** Draft for engineering review
**Audience:** Engineering, QA, Product, Compliance
**Related documents:** HANDOVER.md (project context)

> Saved as-is on 2026-05-19. As we ship features, mark FRs Done/Partial inline. Status tags live in `admin/docs/SRS-STATUS.md` rather than editing this file, so the original spec remains an auditable baseline.

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the **Tavola Admin Portal**, the head-office web application of the HyperGlow restaurant tech platform. The portal consolidates operational, financial, performance, and compliance data sourced from the three companion apps (Order, Kitchen, Manager) and presents it to operator-level users for reporting, configuration, and governance.

This SRS is intended to be sufficient for:
- Engineering teams to estimate, design, build, and test the system
- QA teams to derive test cases from acceptance criteria
- Product managers to validate scope completeness
- Compliance officers to verify regulatory coverage

### 1.2 Scope
The admin portal is **read-mostly for performance data** (the three companion apps are the source of truth) and **write-primary for configuration data** (menus, pricing, staff, settings, recovery budgets).

**In scope:**
- 11 functional modules (Section 4)
- Multi-tenant SaaS architecture with row-level isolation per venue
- Role-based access control with four built-in roles
- Real-time KPI updates (≤30s latency)
- Compliance audit trail (Natasha's Law, GDPR, financial)
- Reporting and export capabilities

**Out of scope:**
- Mobile app version of the admin portal (browser is the primary surface; mobile-responsive only)
- Email marketing / loyalty programs (separate product)
- Inventory management beyond 86-state tracking (deferred to phase 2)
- Payroll integration (read-only HR data; payroll runs externally)

### 1.3 Definitions and Acronyms
| Term | Definition |
|------|------------|
| **AOV** | Average Order Value (per cover) |
| **AOV uplift** | Increment between baseline AOV and actual AOV, attributable to upsell engine |
| **Build sequence** | Multi-screen upsell flow on the Order App (e.g., "Make it a double?") |
| **Cover** | One diner / one guest |
| **86** | Restaurant slang for "out of stock"; an item that cannot be served |
| **KDS** | Kitchen Display System (the Kitchen App) |
| **Natasha's Law** | UK food allergen regulation requiring full ingredient disclosure |
| **PII** | Personally Identifiable Information |
| **RBAC** | Role-Based Access Control |
| **RLS** | Row-Level Security (PostgreSQL feature for multi-tenancy) |
| **Service recovery** | Comp / freebie sent to resolve guest dissatisfaction |
| **Sentiment score** | AI-derived 1–5 score per table based on behavioural signals |
| **SRS** | Software Requirements Specification (this document) |
| **Tenant** | A single venue (e.g., Tavola Soho). Multi-tenant = multiple venues |
| **Upsell** | Modification or addition to an order that increases value |

### 1.4 References
- HANDOVER.md — overall project context and architecture
- Order App: `TavolaOrderApp/` (React Native, source for cart/order events)
- Kitchen App: `TavolaKitchenApp/` (React Native, source for ticket/timing events)
- Manager App: `TavolaManagerApp/` (React Native, source for service/compliance events)
- UK Food Information Regulations 2014 (Natasha's Law)
- UK GDPR / Data Protection Act 2018
- PCI DSS v4.0 (payment card compliance — Stripe handles bulk; portal is SAQ-A scope)
- WCAG 2.1 AA (accessibility)

### 1.5 Document Overview
- **Section 2** — Overall product description and constraints
- **Section 3** — System architecture and data flows
- **Section 4** — Functional requirements (the core of this SRS)
- **Section 5** — Non-functional requirements
- **Section 6** — External interfaces and APIs
- **Section 7** — Data model and retention
- **Section 8** — Appendices: user roles, glossary, acceptance summary

---

## 2. Overall Description

### 2.1 Product Perspective
The admin portal is one of four products in the HyperGlow platform. It is the only one that does not directly affect a live dining session — it is the operator/owner's analytical and configuration surface. Data flows **into** the portal from the other three apps; configuration flows **out** from the portal to all three.

```
                     ┌──────────────────┐
                     │  Admin Portal    │  ← Operator (Anton Joseph et al.)
                     │  (this product)  │
                     └────────┬─────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Order    │    │ Kitchen  │    │ Manager  │
       │ App      │    │ App (KDS)│    │ App      │
       │ (guest)  │    │ (chefs)  │    │ (floor)  │
       └──────────┘    └──────────┘    └──────────┘
```

### 2.2 Product Functions (Summary)
The portal provides 11 functional modules:
1. Authentication & Authorization
2. Dashboard (consolidated KPIs)
3. Revenue Analytics
4. Games (revenue, splits, performance)
5. Upsell Engine (conversion analytics)
6. Service Operations (kitchen, wait, sentiment)
7. Team Management
8. Menu & Pricing
9. Compliance & Audit
10. Settings
11. Reports & Exports

Plus a cross-cutting **Multi-site Management** capability for operators running multiple venues.

### 2.3 User Classes and Characteristics
| Role | Description | Permissions |
|------|-------------|-------------|
| **Operations Director** | Full operator/owner access. The Anton Joseph persona. | All read + write |
| **Venue Manager** | Single-venue access. May or may not have config rights. | Read all; write per assignment |
| **Finance** | Read-only access to revenue, payouts, audit. Cannot change menu. | Read financial + audit |
| **IT Admin** | Manages users, integrations, billing. No operational read. | Write users/settings; no order data |
| **Compliance Officer** | Read-only access to compliance and audit module across all venues. | Read compliance + audit |

A user may hold multiple roles concurrently (additive permissions, never subtractive).

### 2.4 Operating Environment
- **Client:** Modern desktop web browsers (latest two versions of Chrome, Safari, Firefox, Edge)
- **Resolution:** Optimised for 1920×1080; minimum supported 1280×800; mobile-responsive down to 768px tablet width (read-only views)
- **Server:** Linux (Ubuntu 22.04+ or Debian 12+) or managed container platform (AWS ECS / Fly.io / Render)
- **Database:** PostgreSQL 15+ (primary), Redis 7+ (cache/pub-sub), optionally ClickHouse or TimescaleDB for analytics at scale
- **CDN:** CloudFront / Cloudflare for static assets
- **Backend:** Node.js (TypeScript) or Python (FastAPI) — engineering team's choice

### 2.5 Design Constraints
- **Terracotta colour discipline:** Reserved for HyperGlow-monetised surfaces only (see HANDOVER.md §4)
- **Anton Joseph naming:** All manager references use "Anton Joseph", never the deprecated "Sofia Marchetti"
- **80/20 games revenue split:** Hard-coded business rule; must be displayed transparently in the Games module
- **Conservative countdown principle:** Any portal-side time estimate must be ≥ KDS estimate + 2 minutes buffer
- **Real-time tolerance:** Dashboard updates must be ≤30 seconds stale; financial figures may be ≤5 minutes stale

### 2.6 Assumptions and Dependencies
- The three companion apps publish events to a shared event bus (Kafka, Redis Streams, AWS EventBridge, or Supabase Realtime)
- Stripe is the sole payment processor for both food bills (Stripe Terminal at table) and game payments (Stripe Terminal £2 tap)
- An AI inference service exists separately and writes sentiment scores into the database (the portal consumes but does not compute these)
- Authentication is handled by Auth0, Supabase Auth, or an equivalent OIDC-compliant provider

---

## 3. System Architecture

### 3.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser (React/Next.js)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Admin Portal UI                                          │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTPS + WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / BFF                           │
│  Auth · Rate limiting · RBAC enforcement · Tenant isolation      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬────────────────┐
        ▼               ▼               ▼                ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Postgres     │ │ Redis       │ │ ClickHouse  │ │ S3 / Object │
│ (system of   │ │ (cache,     │ │ (analytics, │ │ storage     │
│  record,     │ │  realtime,  │ │  optional   │ │ (images,    │
│  multi-      │ │  pub/sub)   │ │  Phase 2)   │ │  reports)   │
│  tenant RLS) │ │             │ │             │ │             │
└──────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
        ▲               ▲
        │               │
        │     ┌─────────┼──────────┐
        │     │         │          │
   ┌────┴─────┴───┐ ┌───┴─────┐ ┌──┴────────┐
   │ Order App     │ │ Kitchen │ │ Manager   │  (event producers)
   │ events        │ │ App     │ │ App       │
   └───────────────┘ └─────────┘ └───────────┘
```

### 3.2 Data Flow Patterns
| Flow | Source | Destination | Latency | Mechanism |
|------|--------|-------------|---------|-----------|
| Live KPIs | All three apps | Dashboard | ≤30s | WebSocket via pub/sub |
| Financial figures | Order App (payment events) | Revenue module | ≤5min | Event stream → aggregation job |
| Menu config | Admin Portal | Order App, Kitchen App | ≤2s | API call + WebSocket push to apps |
| Compliance log | All three apps | Compliance module | ≤10s | Event stream → append-only audit table |
| Sentiment scores | AI service | Dashboard, Operations | ≤30s | Periodic write to Postgres |

### 3.3 Tenant Isolation
Every database row carries `tenant_id` (= `venue_id` for single-site, future-proofed for multi-site). PostgreSQL Row-Level Security policies enforce that:
- Users can only read/write rows where `tenant_id` matches their assigned venue(s)
- Cross-tenant queries are impossible at the database layer, not the application layer
- Compliance officers with multi-tenant read access bypass via a specific RLS policy on their role

---

## 4. Functional Requirements

> **NOTE:** This section is reproduced from the original SRS draft. Full FR detail tables (FR-AUTH-001 through FR-SITE-005, ~110 requirements) are preserved in the original document. As FRs are implemented, status is tracked in `admin/docs/SRS-STATUS.md`.

The modules and their FR ranges:

- **4.1 AUTH** — FR-AUTH-001 to FR-AUTH-010 (login, SSO, MFA, sessions, password policy, RBAC, auth audit, lockout, password reset, logout)
- **4.2 DASH** — FR-DASH-001 to FR-DASH-011 (KPI strip, live refresh, date range, revenue trend, HG impact, games card, top upsells, server leaderboard, activity feed, export, drill-through)
- **4.3 REV** — FR-REV-001 to FR-REV-009 (category breakdown, hour heatmap, day-of-week, period compare, per cover, per table, forecast, custom range, export)
- **4.4 GAMES** — FR-GAMES-001 to FR-GAMES-009 (summary, 80/20 split, plays-per-day, top games, replay rate, drill-through, availability config, pricing, payout report)
- **4.5 UPSELL** — FR-UPSELL-001 to FR-UPSELL-008 (conversion by option, methodology view, AOV uplift over time, drop-off, A/B tests, cross-sell perf, wait-drinks perf, server-level)
- **4.6 OPS** — FR-OPS-001 to FR-OPS-007 (station perf, wait time, turnover, sentiment, recovery, accuracy, pacing)
- **4.7 TEAM** — FR-TEAM-001 to FR-TEAM-009 (roster, performance, coaching log, scheduling, time clock, tips, add/remove, roles, reviews)
- **4.8 MENU** — FR-MENU-001 to FR-MENU-012 (item CRUD, build sequence, cross-sell, pricing, allergens, photos, categories, 86, versioning, publish, wait drinks, wine pairing)
- **4.9 COMP** — FR-COMP-001 to FR-COMP-008 (allergen chains, refusals, overrides, financial adj., GDPR export, GDPR delete, audit export, dashboard)
- **4.10 SET** — FR-SET-001 to FR-SET-011 (venue, hours, recovery budget, tax, service charge, payments, integrations, users, notifications, billing, backup)
- **4.11 REPT** — FR-REPT-001 to FR-REPT-006 (standard, custom builder, scheduled, formats, sharing, templates)
- **4.12 SITE** — FR-SITE-001 to FR-SITE-005 (switcher, consolidated, permissions, comparison, benchmarks)

Full detail for each FR (priority, description, processing, validation, acceptance criteria, API endpoints) is preserved verbatim in the v1.0 draft. See section history.

---

## 5. Non-Functional Requirements

### 5.1 Performance
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-001 | Dashboard initial load (cold cache) | <2 seconds at p95 |
| NFR-PERF-002 | Dashboard interaction (range change) | <500ms |
| NFR-PERF-003 | Chart render time (any) | <500ms |
| NFR-PERF-004 | KPI refresh interval | 30 seconds |
| NFR-PERF-005 | Menu publish to apps | <2 seconds end-to-end |
| NFR-PERF-006 | Report generation (standard templates) | <10 seconds |
| NFR-PERF-007 | API response time (excluding aggregations) | <300ms at p95 |
| NFR-PERF-008 | API response time (aggregations) | <2 seconds at p95 |
| NFR-PERF-009 | Concurrent users supported | 50 per venue, 5000 platform-wide |
| NFR-PERF-010 | Database query time | <100ms at p95 |

### 5.2 Security
All connections TLS 1.3+, HSTS, OWASP Top-10 mitigations, secrets in Vault/Secrets Manager, AES-256 at rest, Postgres RLS, annual pen-test, weekly vuln scans, PCI DSS SAQ-A, HMAC-signed audit log.

### 5.3 Usability
WCAG 2.1 AA, full keyboard nav, screen-reader ARIA, mobile-responsive ≥768px, latest 2 browser versions, i18n-ready, UK English at launch, GBP at launch.

### 5.4 Reliability
99.9% uptime, RTO 1h, RPO 5min, daily encrypted backups (90-day retention), restore tested quarterly, multi-AZ, graceful degradation when companion apps offline.

### 5.5 Scalability
Linear scaling to 1,000 venues, stateless API tier, read replicas for analytics, Redis cache layer, async job queue for reports.

### 5.6 Compliance
UK GDPR / DPA 2018, Natasha's Law, PCI DSS SAQ-A, 7-year audit retention, right-to-be-forgotten, data portability, DPA template available.

---

## 6. External Interfaces

REST API base `https://api.tavola.hyperglow.app/v1/`, JWT bearer auth, JSON content, RFC 7807 errors, WebSocket for realtime. Full OpenAPI spec generated from code.

---

## 7. Data Requirements

### 7.1 Core Data Model (Postgres)
| Table | Purpose | Tenant-scoped? |
|-------|---------|----------------|
| `users` | System users (login accounts) | Cross-tenant (org-level) |
| `roles` | User role assignments | Yes |
| `venues` | Restaurants | N/A (this IS the tenant) |
| `tables` | Physical tables per venue | Yes |
| `staff` | Servers, chefs, etc. | Yes |
| `menu_items` | Menu items | Yes |
| `build_sequences` | Upsell flow definitions | Yes |
| `build_options` | Options within a build step | Yes |
| `orders` | Orders placed | Yes |
| `order_lines` | Line items within orders | Yes |
| `order_modifiers` | Build selections per line | Yes |
| `payments` | Payment transactions | Yes |
| `game_plays` | Game payment + play records | Yes |
| `sentiment_scores` | AI-scored sentiment per table per session | Yes |
| `recovery_events` | Service recovery comps | Yes |
| `allergen_chains` | Natasha's Law verification chain | Yes |
| `audit_events` | All audit-loggable events | Yes |
| `staff_shifts` | Shift assignments | Yes |
| `coaching_events` | Manager coaching prompts | Yes |
| `upsell_events` | Build screen view + selection | Yes |
| `bookings` | Reservations (OpenTable et al.) | Yes |

### 7.2 Data Retention
| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Audit log | 7 years | Regulatory minimum |
| Financial records | 6 years | UK tax law |
| Allergen chains | 7 years | Natasha's Law |
| PII | Until deletion request or 3 years post-last-visit | GDPR minimisation |
| Operational | 3 years | Business analytics |
| Sentiment | 1 year individual / forever aggregated | — |
| Redis state | Session TTL | Operational |

### 7.3 Data Privacy
Column-level pgcrypto for regulated PII; per-tenant export and deletion supported.

---

## 8. Appendices

### 8.1 RBAC Permissions Matrix
| Capability | Ops Director | Venue Manager | Finance | IT Admin | Compliance |
|-----------|--------------|---------------|---------|----------|------------|
| View dashboard | ✓ | ✓ | ✓ | — | ✓ |
| View revenue | ✓ | ✓ | ✓ | — | ✓ |
| View games | ✓ | ✓ | ✓ | — | ✓ |
| View upsell | ✓ | ✓ | — | — | — |
| View operations | ✓ | ✓ | — | — | — |
| View team | ✓ | ✓ | — | — | — |
| View menu | ✓ | ✓ | — | — | ✓ |
| Edit menu | ✓ | ✓ | — | — | — |
| Edit pricing | ✓ | — | — | — | — |
| Edit allergens | ✓ | ✓ | — | — | ✓ |
| View compliance | ✓ | ✓ | ✓ | — | ✓ |
| Export compliance | ✓ | — | — | — | ✓ |
| GDPR actions | — | — | — | — | ✓ |
| Manage users | — | — | — | ✓ | — |
| Manage billing | ✓ | — | ✓ | — | — |
| Manage venue config | ✓ | — | — | — | — |
| Manage integrations | — | — | — | ✓ | — |

### 8.4 Out-of-Scope Items (Phase 2+)
Mobile admin app, email marketing, loyalty, full inventory, payroll engine, multi-currency, multi-language, predictive maintenance, advanced ML forecasting.

---

## 9. Change Log
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-19 | Anton Joseph + Claude (session draft) | Initial draft |

**End of Software Requirements Specification**
