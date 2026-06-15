# Implementation Plan — Phase 2: Offline-First Tablets

**Goal:** A venue keeps trading through an internet outage. Guests can still order;
the kitchen still sees those orders.

**Status:** Proposal for review. No code written yet.

---

## 0. The architecture decision we must make FIRST

There's a fork in the road, and the team has to pick a branch before any code:

Today every tablet talks to the cloud VPS over the internet:

```
   Order tablet ─┐
   KDS          ─┼──► [ internet ] ──► VPS (device-api + Postgres)
   Manager      ─┘
```

**The trap:** if we only make the *order tablet* cache and queue offline, the guest
sees "order placed" — but the **kitchen never sees it** until the internet returns,
because the KDS also reaches the kitchen data *through the same dead internet link*.
That's not "the venue keeps operating." That's "the guest is lied to."

So there are two genuinely different scopes:

### Scope A — "Survive a blip" (app-only, cheap)
Order tablet queues orders locally and flushes when the link returns. Good for outages
measured in **seconds to a few minutes**. The kitchen sees a short delay, not a failure.
- Effort: ~1 week. Cost: £0 infra.
- Limitation: during a *real* outage (minutes+), the kitchen is blind. Acceptable only
  if outages are rare and short.

### Scope B — "Survive a real outage" (on-premise local node)
Put a small **local server at the venue** (a mini-PC, ~£150 one-off, or repurpose a
spare machine) running its own `device-api` + Postgres. All tablets and the KDS talk to
it over the **venue's LAN** — which keeps working even when the *internet* to the outside
world is down. The local node syncs to the cloud when the internet returns.

```
   Order tablet ─┐
   KDS          ─┼──► [ venue LAN ] ──► LOCAL NODE (device-api + Postgres)
   Manager      ─┘                            │
                                              └─ syncs to ──► CLOUD VPS  (when online)
```

- Effort: ~3–4 weeks. Cost: ~£150 one-off hardware per venue.
- This is the **real** answer for a restaurant. The kitchen keeps running through a
  full internet outage because everything it needs is on the LAN.
- This is "Tier 4" from the resilience brief — note Phase 2 and Tier 4 overlap.

> **Recommendation:** build **Scope A first** (it's a strict subset of B and ships value
> fast), structured so it upgrades cleanly into **Scope B** by simply repointing the
> tablets' API URL from the cloud to the local node. The local-node sync engine is the
> only net-new piece B adds.

The rest of this plan covers **Scope A**, with notes on where it extends to B.

---

## 1. What "offline-capable" requires (the four pillars)

| Pillar | Why | Where |
|--------|-----|-------|
| **Menu cache** | Can't browse what you can't fetch | Order App — persist menu to disk |
| **Outbox queue** | Orders placed offline must survive + retry | Order App — persisted queue |
| **Idempotency** | A retried order must not double-charge / double-cook | device-api + DB — dedupe key |
| **Connectivity awareness** | Know when to flush the queue | Order App — netinfo + retry loop |

---

## 2. Database change (1 migration)

Add an idempotency key so a queued order that gets retried lands exactly once:

```ts
// packages/db/src/schema.ts — orders table
clientOrderId: text('client_order_id').unique(),   // UUID generated on the tablet
```

- Nullable (existing online orders don't need it; we set it for all new orders going forward).
- `UNIQUE` → the second insert of the same `clientOrderId` is rejected at the DB,
  and the server returns the already-created order instead of erroring.

One migration: `pnpm db:generate && pnpm db:migrate`.

---

## 3. device-api changes

### 3a. Make `POST /v1/orders` idempotent

```
Accept body.clientOrderId (UUID).
On insert:
  - if clientOrderId already exists → return the existing order (200, not 201)
  - else create as normal (201)
Wrap in INSERT ... ON CONFLICT (client_order_id) DO NOTHING + re-select.
```

This is the single most important server change — it makes "retry safely" possible.
Without it, a flaky connection that drops *after* the server saved the order but *before*
the tablet got the response would place the order twice on retry.

### 3b. (Scope B only) Sync endpoints

For the local-node version, add:
- `POST /v1/sync/push` — local node sends a batch of orders/bumps to cloud
- `GET /v1/sync/pull?since=…` — local node pulls menu/config changes from cloud

Skip for Scope A.

---

## 4. Order App changes (the bulk of the work)

### 4a. New dependency

```
@react-native-community/netinfo   # connectivity detection (online/offline events)
```

`@react-native-async-storage/async-storage` is **already installed** — we use it for
persistence.

### 4b. Persist the menu cache — `src/store/menuStore.js`

```
On successful fetchMenu():
  - save { items, categories, fetchedAt } to AsyncStorage key "menu-cache"
On hydrate(), BEFORE the network call:
  - load the cache so the UI has data instantly, even offline
  - then try the network; on success, refresh + re-save; on failure, keep the cache
```

Net effect: a tablet that booted online once will always have a menu, even if it boots
later with no internet.

### 4c. New persisted outbox — `src/store/outboxStore.js` (new file)

```
State (persisted to AsyncStorage):
  queue: [{ clientOrderId, payload, createdAt, attempts, status }]

Actions:
  enqueue(order)   → push, generate clientOrderId (UUID), persist
  flush()          → for each pending, POST to device-api; on success mark sent;
                     on idempotent-200 also mark sent; on network error leave pending
  markSent(id), incrementAttempt(id)
```

The queue is the heart of offline ordering: placing an order = enqueue + try-flush.

### 4d. Rework `placeOrder` — `src/store/orderStore.js`

```
placeOrder():
  1. generate clientOrderId
  2. enqueue into outbox (persisted) — this NEVER fails, even offline
  3. set the local active order immediately (guest sees confirmation instantly)
  4. trigger outbox.flush() in the background
  5. when flush succeeds, attach the server orderId + line ids to the active order
```

The guest experience is identical online or offline — they always get a confirmation.
The difference is purely whether the kitchen sees it now (online) or on reconnect (Scope A)
/ immediately over LAN (Scope B).

### 4e. Connectivity-driven flush — `src/api/connectivity.js` (new file)

```
Subscribe to NetInfo.
On transition offline→online:
  - outboxStore.flush()
Also flush on a 15s timer while pending items exist (belt-and-braces).
Surface an "offline — N orders queued" banner in the UI when offline + queue non-empty.
```

### 4f. UI touches

- A small **offline banner** (amber strip) when disconnected, showing queued count.
- Order-status screen reads from local state (already does) so it works offline.
- Disable the **games** + **card payment** flows when offline (they need the network /
  Stripe). Show "available once you're back online." Cash / pay-at-table stays available.

---

## 5. What offline mode deliberately does NOT do (scope honesty)

| Thing | Why it can't work offline | Mitigation |
|-------|---------------------------|------------|
| **Card payment** | Stripe Terminal needs the network to authorise | Offer cash / pay-at-table; queue card payment for reconnect |
| **£2 games** | Charged via Stripe at game start | Hide games while offline |
| **Live menu edits** | Tablet uses its cached menu | Cache is refreshed every time it's online; stale-by-minutes is fine |
| **Kitchen sees order instantly (Scope A)** | KDS reaches data via the dead link | This is exactly why Scope B (local node) exists |
| **Server-side re-pricing of brand-new items** | Tablet prices from cached menu | Server re-validates prices on sync; flag mismatches |

These are worth stating out loud in the meeting so nobody expects offline card payments.

---

## 6. Build order (Scope A)

1. **DB:** add `clientOrderId`, migrate. *(½ day)*
2. **device-api:** idempotent `POST /v1/orders`. *(½ day)*
3. **Order App:** menu cache persistence. *(1 day)*
4. **Order App:** outbox store + persistence. *(1.5 days)*
5. **Order App:** rework `placeOrder` to enqueue-first. *(1 day)*
6. **Order App:** netinfo + flush loop + offline banner. *(1 day)*
7. **Test:** airplane-mode the emulator mid-order, confirm queue + reconnect flush + no
   duplicates. *(1 day)*

**~1 week of focused work for Scope A.** Scope B adds the local-node packaging + a sync
engine (~2–3 more weeks) and is a clean follow-on because the tablet code is identical —
only the API URL changes from cloud to local node.

---

## 7. Decision needed from the team

1. **Scope A now, or jump to Scope B?** Recommendation: A now (1 week, ships value,
   upgrades cleanly), B when a venue's outages prove long enough to need it.
2. **Confirm offline payment policy:** cash/pay-at-table only when offline — acceptable?
3. **If/when Scope B:** budget ~£150/venue for a mini-PC local node.

---

*This plan upgrades the existing `tabletop-app` + `device-api` already wired in this repo;
it does not require re-platforming. The idempotency key is the one piece worth landing
early regardless of scope — it makes every retry safe.*
