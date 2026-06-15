# Resilience Brief — Eliminating Single Points of Failure

**For:** Team discussion
**Objective:** A single point of failure should not stop the operation of the system.
**Prepared:** HyperGlow / Tavola platform

---

## 1. Where the system can fail today

```
                         ┌──────────────────────────────────┐
                         │            ONE VPS                │
                         │                                   │
   Guest tablets ──┐     │   ┌─────────┐   ┌──────────────┐  │
   (Order App)     ├─Wi──┼──►│ device- │──►│              │  │
   Kitchen (KDS) ──┤  Fi │   │  api    │   │  Postgres    │  │
   Admin browser ──┘     │   └─────────┘   │  (single DB) │  │
                         │   ┌─────────┐   │              │  │
                         │   │ admin   │──►│              │  │
                         │   │  web    │   └──────────────┘  │
                         │   └─────────┘          │          │
                         └────────────────────────┼──────────┘
                                                  ▼
                                       nightly pg_dump (ON the same box)

   ⚠ SPOF #1: the VPS — if it dies, everything dies
   ⚠ SPOF #2: Postgres — one DB process / one disk
   ⚠ SPOF #3: venue internet — tablets can't reach the VPS at all
   ⚠ SPOF #4: backups live on the same box they're protecting
```

**Key point for the discussion:** there are *four* single points of failure, and a
"distributed database" only addresses one of them (#2). The cheapest, highest-impact
fixes are elsewhere.

---

## 2. What actually stops a restaurant — ranked by likelihood

| # | Failure | How often | Does a distributed DB fix it? | The real fix |
|---|---------|-----------|-------------------------------|--------------|
| 1 | **Venue loses internet** | Common | ❌ No | Offline-first tablets (local queue + sync) |
| 2 | VPS reboots / crashes | Occasional | Partially | Standby VPS + DB replica failover |
| 3 | Postgres crashes / disk full | Rare | ✅ Yes | Hot replica + monitoring |
| 4 | Disk failure / data loss | Rare but fatal | ❌ No (that's backups) | Off-site backups + tested restore |

> The thing most likely to stop service in a single venue is **#1 — the internet drop** —
> and no database architecture in our datacenter can fix that. It's an *application*
> problem (the tablets must keep working offline), not a *database* problem.

---

## 3. The unavoidable trade-off (CAP)

When parts of a distributed system can't talk to each other, you must pick:

- **Consistency** — refuse to operate rather than risk two nodes disagreeing, **or**
- **Availability** — keep taking orders, reconcile any differences afterwards

**For a restaurant, availability wins.** We'd rather take the order and resolve a rare
duplicate later than tell a guest "the system is down." This choice drives the design:
we favour eventual consistency and local-first operation over strict global consistency.

---

## 4. The options, tiered by cost & effort

| Tier | What | Fixes | Effort | Extra cost/mo | When |
|------|------|-------|--------|---------------|------|
| **T1** | **Off-site automated backups** (ship nightly dumps to S3/Backblaze, test restore quarterly) | #4 data loss | ½ day | ~£5 | **Now** |
| **T2** | **Offline-first tablets** (Order App + KDS cache menu locally, queue orders, sync on reconnect) | #1 internet drop | 1–2 weeks | £0 | **Next** |
| **T3** | **Postgres standby + auto-failover** (2nd VPS, streaming replica, Patroni promotes it if primary dies) | #2, #3 | 3–5 days | ~£20–40 (2nd VPS) | When uptime SLA matters |
| **T4** | **Per-branch local node + central sync** (each venue runs its own DB; HQ aggregates) | #1, #2, #3 at scale | weeks | per-venue HW | Many venues |
| **T5** | **True distributed engine** (CockroachDB / YugabyteDB, multi-primary, auto-sharded) | All DB SPOFs | weeks + re-platform | 3+ nodes | 1000s of venues |

"Distributed database" in the strict sense = **T4/T5**. Note they're the most expensive
and the *last* things to reach for — not the first.

---

## 5. Recommendation for HyperGlow

Our system is **multi-branch, but each branch's data is independent** (every venue is its
own tenant — branches don't share orders or menus). That shapes the answer:

> **A branch going down must not affect other branches, and within a branch the dominant
> failure is the internet link — not the central database.**

So the classic "one big distributed database" is **not** the right first move. The
right architecture for us is **edge-resilient, centrally-backed**:

### Phase 1 — do this month (cheap, removes the worst risks)
- **T1: Off-site backups.** We already run nightly `pg_dump` on the VPS — just `rclone`
  it to Backblaze B2 nightly. ½ day, ~£5/mo. Removes the "lose everything" risk.
- Add basic **uptime monitoring + alerting** (UptimeRobot free) so we *know* within
  minutes if the VPS or device-api is down.

### Phase 2 — the real resilience win (next quarter)
- **T2: Offline-first tablets.** Make the Order App and KDS keep working with no internet:
  menu cached locally, orders queued on-device, auto-sync when the link returns. This is
  what actually keeps a venue trading through an outage. It's app work, not DB work, and
  costs nothing in infrastructure.

### Phase 3 — when we sign a client with an uptime SLA
- **T3: Postgres standby + automatic failover** (Patroni + a 2nd VPS). This is the
  precise answer to "the database is a single point of failure" — a hot replica takes
  over automatically if the primary dies, with no engine change. ~£20–40/mo.

### Phase 4 — only at real scale (many venues / enterprise)
- **T4: per-branch local node syncing to HQ.** Each venue runs a small local Postgres
  that survives total internet loss and syncs upstream. Revisit T5 (Cockroach/Yugabyte)
  only if we're operating at a scale where T4's operational load becomes the bottleneck.

### One-line summary for the team
> **We don't need a distributed database yet. The biggest resilience wins for a
> single-venue restaurant are (1) off-site backups and (2) offline-capable tablets —
> both cheaper and higher-impact than database clustering. A Postgres hot-standby
> answers the literal "DB single point of failure" without changing engines, and we add
> it the moment a client needs an uptime guarantee.**

---

## 6. Suggested decisions to take tomorrow

1. ✅ Approve **Phase 1** (off-site backups + monitoring) — low cost, do immediately.
2. 🗓 Scope **Phase 2** (offline-first tablets) into the roadmap — biggest real-world win.
3. 📋 Agree the **trigger** for Phase 3 (e.g. "first client contract with an uptime SLA").
4. 🅿 Park T4/T5 (true distributed DB) as "revisit at N venues" — document N.

---

*Appendix — terms*
- **SPOF** — single point of failure
- **Replica / standby** — a live copy of the DB kept in sync with the primary
- **Failover** — promoting a replica to primary when the primary dies (manual or automatic)
- **Offline-first** — app keeps working without a network, syncing when it returns
- **CAP** — you can't have Consistency *and* Availability during a network partition; pick one
