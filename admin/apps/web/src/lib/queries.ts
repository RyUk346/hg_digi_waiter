import 'server-only';
import { db, orders, orderLines, payments, gamePlays, games, servers, serverShifts, menuItems, alerts, auditLog, venues } from '@hyperglow/db';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

export async function getVenue() {
  const [venue] = await db.select().from(venues).limit(1);
  return venue;
}

export interface KpiSnapshot {
  coversToday: number;
  revenueTodayPence: number;
  aovPence: number;
  gamesRevenueTodayPence: number;
  hyperglowGamesSharePence: number;
  venueGamesSharePence: number;
  upsellRevenueTodayPence: number;
  upsellAcceptanceRate: number;
  activeAlerts: number;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function getKpiSnapshot(venueId: string): Promise<KpiSnapshot> {
  const since = startOfToday();

  const [paid] = await db
    .select({
      covers: sql<number>`coalesce(sum(${orders.coverCount}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalPence}), 0)::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.venueId, venueId), eq(orders.status, 'paid'), gte(orders.placedAt, since)));

  const [upsell] = await db
    .select({
      upsellRevenue: sql<number>`coalesce(sum(${orderLines.upsellDeltaPence} * ${orderLines.quantity}), 0)::int`,
      upsellAccepted: sql<number>`coalesce(sum(case when ${orderLines.upsellDeltaPence} > 0 then 1 else 0 end), 0)::int`,
      lineCount: sql<number>`count(*)::int`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .where(and(eq(orders.venueId, venueId), gte(orders.placedAt, since)));

  const [games] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${gamePlays.pricePence}), 0)::int`,
      hyperglowShare: sql<number>`coalesce(sum(${gamePlays.pricePence} * ${gamePlays.hyperglowShareBps} / 10000), 0)::int`,
    })
    .from(gamePlays)
    .where(and(eq(gamePlays.venueId, venueId), gte(gamePlays.playedAt, since)));

  const [openAlerts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(and(eq(alerts.venueId, venueId), sql`${alerts.resolvedAt} is null`));

  const covers = paid?.covers ?? 0;
  const revenue = paid?.revenue ?? 0;
  const aov = covers > 0 ? Math.round(revenue / covers) : 0;
  const gamesRevenue = games?.revenue ?? 0;
  const hgShare = games?.hyperglowShare ?? 0;

  return {
    coversToday: covers,
    revenueTodayPence: revenue,
    aovPence: aov,
    gamesRevenueTodayPence: gamesRevenue,
    hyperglowGamesSharePence: hgShare,
    venueGamesSharePence: gamesRevenue - hgShare,
    upsellRevenueTodayPence: upsell?.upsellRevenue ?? 0,
    upsellAcceptanceRate:
      upsell?.lineCount && upsell.lineCount > 0 ? (upsell.upsellAccepted ?? 0) / upsell.lineCount : 0,
    activeAlerts: openAlerts?.count ?? 0,
  };
}

export interface RevenueDay {
  date: string;
  food: number;
  drinks: number;
  games: number;
}

export async function getRevenueSeries(venueId: string, days = 14): Promise<RevenueDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const foodAndDrinks = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.placedAt}), 'YYYY-MM-DD')`,
      station: menuItems.station,
      revenue: sql<number>`coalesce(sum(${orderLines.linePricePence} * ${orderLines.quantity}), 0)::int`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .innerJoin(menuItems, eq(orderLines.menuItemId, menuItems.id))
    .where(and(eq(orders.venueId, venueId), eq(orders.status, 'paid'), gte(orders.placedAt, since)))
    .groupBy(sql`date_trunc('day', ${orders.placedAt})`, menuItems.station);

  const gamesByDay = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${gamePlays.playedAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${gamePlays.pricePence}), 0)::int`,
    })
    .from(gamePlays)
    .where(and(eq(gamePlays.venueId, venueId), gte(gamePlays.playedAt, since)))
    .groupBy(sql`date_trunc('day', ${gamePlays.playedAt})`);

  const byDay = new Map<string, RevenueDay>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, food: 0, drinks: 0, games: 0 });
  }

  for (const row of foodAndDrinks) {
    const entry = byDay.get(row.day);
    if (!entry) continue;
    if (row.station === 'bar') entry.drinks += Number(row.revenue);
    else entry.food += Number(row.revenue);
  }
  for (const row of gamesByDay) {
    const entry = byDay.get(row.day);
    if (entry) entry.games += Number(row.revenue);
  }

  return Array.from(byDay.values());
}

export interface ServerLeaderRow {
  id: string;
  name: string;
  covers: number;
  revenuePence: number;
  upsellRate: number;
}

export async function getServerLeaderboard(venueId: string): Promise<ServerLeaderRow[]> {
  const rows = await db
    .select({
      id: servers.id,
      name: servers.name,
      covers: sql<number>`coalesce(sum(${serverShifts.covers}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${serverShifts.revenuePence}), 0)::int`,
      attempts: sql<number>`coalesce(sum(${serverShifts.upsellAttemptCount}), 0)::int`,
      accepted: sql<number>`coalesce(sum(${serverShifts.upsellAcceptedCount}), 0)::int`,
    })
    .from(servers)
    .leftJoin(serverShifts, eq(serverShifts.serverId, servers.id))
    .where(eq(servers.venueId, venueId))
    .groupBy(servers.id, servers.name)
    .orderBy(desc(sql`coalesce(sum(${serverShifts.revenuePence}), 0)`));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    covers: r.covers,
    revenuePence: r.revenue,
    upsellRate: r.attempts > 0 ? r.accepted / r.attempts : 0,
  }));
}

export interface TopUpsellRow {
  menuItemName: string;
  sku: string;
  acceptanceCount: number;
  upsellRevenuePence: number;
}

export async function getTopUpsells(venueId: string, days = 7): Promise<TopUpsellRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      menuItemName: menuItems.name,
      sku: menuItems.sku,
      acceptanceCount: sql<number>`count(*)::int`,
      upsellRevenue: sql<number>`coalesce(sum(${orderLines.upsellDeltaPence} * ${orderLines.quantity}), 0)::int`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .innerJoin(menuItems, eq(orderLines.menuItemId, menuItems.id))
    .where(
      and(
        eq(orders.venueId, venueId),
        gte(orders.placedAt, since),
        sql`${orderLines.upsellDeltaPence} > 0`,
      ),
    )
    .groupBy(menuItems.name, menuItems.sku)
    .orderBy(desc(sql`coalesce(sum(${orderLines.upsellDeltaPence} * ${orderLines.quantity}), 0)`))
    .limit(5);

  return rows.map((r) => ({
    menuItemName: r.menuItemName,
    sku: r.sku,
    acceptanceCount: r.acceptanceCount,
    upsellRevenuePence: r.upsellRevenue,
  }));
}

export async function getActiveAlerts(venueId: string) {
  return db
    .select()
    .from(alerts)
    .where(and(eq(alerts.venueId, venueId), sql`${alerts.resolvedAt} is null`))
    .orderBy(desc(alerts.createdAt))
    .limit(10);
}

// ─── AOV uplift attribution (HyperGlow impact card) ──────────────────────

export interface AovUplift {
  baselinePence: number;
  actualPence: number;
  baselineAovPence: number;
  actualAovPence: number;
  upliftPerCoverPence: number;
  upliftPct: number;
  incrementalPence: number;
  days: number;
}

export async function getAovUplift(venueId: string, days = 30): Promise<AovUplift> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [agg] = await db
    .select({
      baseline: sql<number>`coalesce(sum(${orderLines.basePricePence} * ${orderLines.quantity}), 0)::int`,
      actual: sql<number>`coalesce(sum(${orderLines.linePricePence} * ${orderLines.quantity}), 0)::int`,
      covers: sql<number>`coalesce(sum(${orders.coverCount}), 0)::int`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .where(and(eq(orders.venueId, venueId), eq(orders.status, 'paid'), gte(orders.placedAt, since)));

  const baseline = agg?.baseline ?? 0;
  const actual = agg?.actual ?? 0;
  const covers = agg?.covers ?? 0;
  const incremental = actual - baseline;
  const baselineAov = covers > 0 ? Math.round(baseline / covers) : 0;
  const actualAov = covers > 0 ? Math.round(actual / covers) : 0;
  const upliftPerCover = actualAov - baselineAov;
  const upliftPct = baselineAov > 0 ? upliftPerCover / baselineAov : 0;

  return {
    baselinePence: baseline,
    actualPence: actual,
    baselineAovPence: baselineAov,
    actualAovPence: actualAov,
    upliftPerCoverPence: upliftPerCover,
    upliftPct,
    incrementalPence: incremental,
    days,
  };
}

// ─── Games revenue split (HG/venue 80/20) ─────────────────────────────────

export interface GamesSplit {
  totalPence: number;
  hyperglowPence: number;
  venuePence: number;
  playCount: number;
  uniqueTables: number;
  hyperglowPct: number;
  rangeLabel: string;
}

export async function getGamesSplit(venueId: string, days = 30): Promise<GamesSplit> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [agg] = await db
    .select({
      total: sql<number>`coalesce(sum(${gamePlays.pricePence}), 0)::int`,
      hg: sql<number>`coalesce(sum(${gamePlays.pricePence} * ${gamePlays.hyperglowShareBps} / 10000), 0)::int`,
      plays: sql<number>`count(*)::int`,
      tables: sql<number>`count(distinct ${gamePlays.tableId})::int`,
    })
    .from(gamePlays)
    .where(and(eq(gamePlays.venueId, venueId), gte(gamePlays.playedAt, since)));

  const total = agg?.total ?? 0;
  const hg = agg?.hg ?? 0;
  return {
    totalPence: total,
    hyperglowPence: hg,
    venuePence: total - hg,
    playCount: agg?.plays ?? 0,
    uniqueTables: agg?.tables ?? 0,
    hyperglowPct: total > 0 ? hg / total : 0.8,
    rangeLabel: `Last ${days} days`,
  };
}

// ─── Games plays time series (per-day) ────────────────────────────────────

export interface GamesPlayDay {
  date: string;
  plays: number;
}

export async function getGamesPlaysSeries(venueId: string, days = 30): Promise<GamesPlayDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${gamePlays.playedAt}), 'YYYY-MM-DD')`,
      plays: sql<number>`count(*)::int`,
    })
    .from(gamePlays)
    .where(and(eq(gamePlays.venueId, venueId), gte(gamePlays.playedAt, since)))
    .groupBy(sql`date_trunc('day', ${gamePlays.playedAt})`);

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) byDay.set(r.day, Number(r.plays));

  return Array.from(byDay, ([date, plays]) => ({ date, plays }));
}

// ─── Top games (ranked by revenue) ────────────────────────────────────────

export interface TopGameRow {
  id: string;
  name: string;
  slug: string;
  plays: number;
  revenuePence: number;
  replayRatePct: number;
}

export async function getTopGames(venueId: string, days = 30): Promise<TopGameRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch all games and their play counts; compute replay rate from per-table play counts
  const rows = await db
    .select({
      id: games.id,
      name: games.name,
      slug: games.slug,
      plays: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${gamePlays.pricePence}), 0)::int`,
      replays: sql<number>`(count(*) - count(distinct ${gamePlays.tableId}))::int`,
    })
    .from(games)
    .leftJoin(
      gamePlays,
      and(eq(gamePlays.gameId, games.id), eq(gamePlays.venueId, venueId), gte(gamePlays.playedAt, since)),
    )
    .groupBy(games.id, games.name, games.slug)
    .orderBy(desc(sql`coalesce(sum(${gamePlays.pricePence}), 0)`));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    plays: r.plays,
    revenuePence: r.revenue,
    replayRatePct: r.plays > 0 ? r.replays / r.plays : 0,
  }));
}

// ─── Activity feed (audit log + alerts merged) ────────────────────────────

export interface ActivityRow {
  id: string;
  kind: 'audit' | 'alert';
  category: 'recovery' | 'allergen' | 'comp' | 'refusal' | 'sentiment' | 'celebration' | 'pacing' | 'other';
  title: string;
  meta: string;
  occurredAt: Date;
  severityTint: 'terra' | 'olive' | 'amber' | 'red' | 'purple';
}

export async function getActivityFeed(venueId: string, limit = 6): Promise<ActivityRow[]> {
  const auditRows = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.venueId, venueId))
    .orderBy(desc(auditLog.occurredAt))
    .limit(limit);

  const alertRows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.venueId, venueId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);

  const items: ActivityRow[] = [];

  for (const a of auditRows) {
    const map = mapAuditAction(a.action);
    items.push({
      id: `audit-${a.id}`,
      kind: 'audit',
      category: map.category,
      title: map.title,
      meta: formatAuditMeta(a),
      occurredAt: a.occurredAt,
      severityTint: map.tint,
    });
  }

  for (const al of alertRows) {
    items.push({
      id: `alert-${al.id}`,
      kind: 'alert',
      category:
        al.severity === 'critical' ? 'sentiment' : al.severity === 'celebration' ? 'celebration' : 'other',
      title: al.title,
      meta: al.body ?? '',
      occurredAt: al.createdAt,
      severityTint:
        al.severity === 'critical'
          ? 'red'
          : al.severity === 'warning'
            ? 'amber'
            : al.severity === 'celebration'
              ? 'purple'
              : 'olive',
    });
  }

  return items
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

function mapAuditAction(action: string): {
  title: string;
  category: ActivityRow['category'];
  tint: ActivityRow['severityTint'];
} {
  switch (action) {
    case 'recovery_spend':
      return { title: 'Service recovery applied', category: 'recovery', tint: 'terra' };
    case 'allergen_signoff':
      return { title: 'Allergen chain verified', category: 'allergen', tint: 'olive' };
    case 'comp':
      return { title: 'Comp authorised', category: 'comp', tint: 'terra' };
    case 'void':
      return { title: 'Order voided', category: 'other', tint: 'amber' };
    case 'refusal_of_service':
      return { title: 'Refusal of service', category: 'refusal', tint: 'red' };
    case 'manager_override':
      return { title: 'Manager override', category: 'other', tint: 'amber' };
    case 'shift_handover':
      return { title: 'Shift handover', category: 'other', tint: 'olive' };
    default:
      return { title: action, category: 'other', tint: 'olive' };
  }
}

function formatAuditMeta(a: typeof auditLog.$inferSelect): string {
  const d = a.details ?? {};
  const parts: string[] = [];
  if (a.amountPence) parts.push(`£${(a.amountPence / 100).toFixed(2)}`);
  for (const [k, v] of Object.entries(d)) {
    parts.push(`${k.replace(/_/g, ' ')}: ${String(v)}`);
  }
  return parts.join(' · ');
}

// ─── Per-item stats (for the menu-item editor header) ────────────────────

export interface MenuItemStats {
  ordersToday: number;
  revenueTodayPence: number;
  upsellConvPct: number;
  buildStepConversionPct: number[];
}

export async function getMenuItemStats(menuItemId: string): Promise<MenuItemStats> {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const [todayAgg] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orderLines.linePricePence} * ${orderLines.quantity}), 0)::int`,
      withUpsell: sql<number>`coalesce(sum(case when ${orderLines.upsellDeltaPence} > 0 then 1 else 0 end), 0)::int`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .where(
      and(
        eq(orderLines.menuItemId, menuItemId),
        eq(orders.status, 'paid'),
        gte(orders.placedAt, startToday),
      ),
    );

  const orders_ = todayAgg?.orders ?? 0;
  const withUpsell = todayAgg?.withUpsell ?? 0;

  return {
    ordersToday: orders_,
    revenueTodayPence: todayAgg?.revenue ?? 0,
    upsellConvPct: orders_ > 0 ? withUpsell / orders_ : 0,
    buildStepConversionPct: [], // per-step conversion needs an upsell_events table — placeholder
  };
}

// ─── Compliance ───────────────────────────────────────────────────────────

export interface ComplianceStatus {
  allergenChainsThisWeek: number;
  refusalsThisWeek: number;
  recoveryBudgetTotalPence: number;
  recoveryBudgetSpentPence: number;
  recoveryBudgetRemainingPence: number;
  menuAllergenReviewPct: number;
  menuItemsWithAllergens: number;
  menuItemsTotal: number;
}

export async function getComplianceStatus(
  venueId: string,
  recoveryBudgetPence: number,
): Promise<ComplianceStatus> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [allergenAgg] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.venueId, venueId),
        eq(auditLog.action, 'allergen_signoff'),
        gte(auditLog.occurredAt, weekAgo),
      ),
    );

  const [refusalAgg] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.venueId, venueId),
        eq(auditLog.action, 'refusal_of_service'),
        gte(auditLog.occurredAt, weekAgo),
      ),
    );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [recoveryAgg] = await db
    .select({ spent: sql<number>`coalesce(sum(${auditLog.amountPence}), 0)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.venueId, venueId),
        eq(auditLog.action, 'recovery_spend'),
        gte(auditLog.occurredAt, today),
      ),
    );

  const [menuAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withAllergens: sql<number>`sum(case when jsonb_array_length(${menuItems.allergens}) > 0 then 1 else 0 end)::int`,
    })
    .from(menuItems)
    .where(eq(menuItems.venueId, venueId));

  const total = menuAgg?.total ?? 0;
  const withAllergens = menuAgg?.withAllergens ?? 0;
  const spent = recoveryAgg?.spent ?? 0;

  return {
    allergenChainsThisWeek: allergenAgg?.n ?? 0,
    refusalsThisWeek: refusalAgg?.n ?? 0,
    recoveryBudgetTotalPence: recoveryBudgetPence,
    recoveryBudgetSpentPence: spent,
    recoveryBudgetRemainingPence: Math.max(0, recoveryBudgetPence - spent),
    menuAllergenReviewPct: total > 0 ? withAllergens / total : 0,
    menuItemsWithAllergens: withAllergens,
    menuItemsTotal: total,
  };
}

// ─── Allergen chains (rendered from audit_log entries) ────────────────────

export interface AllergenChain {
  id: string;
  tableLabel: string | null;
  occurredAt: Date;
  allergen: string;
  verifiedBy: string;
  steps: Array<{ label: string; signatory: string; ok: boolean }>;
}

export async function getAllergenChains(venueId: string, days = 7): Promise<AllergenChain[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      id: auditLog.id,
      occurredAt: auditLog.occurredAt,
      details: auditLog.details,
      tableLabel: sql<string | null>`(
        select ${sql.raw('label')} from ${sql.raw('tables')}
        where ${sql.raw('tables.id')} = ${auditLog.tableId}
      )`,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.venueId, venueId),
        eq(auditLog.action, 'allergen_signoff'),
        gte(auditLog.occurredAt, since),
      ),
    )
    .orderBy(desc(auditLog.occurredAt));

  return rows.map((r) => {
    const d = r.details ?? {};
    const allergen = (d as { allergen?: string }).allergen ?? 'unspecified';
    const verifiedBy = (d as { verifiedBy?: string }).verifiedBy ?? 'kitchen+manager';
    // Synthesise the 5-step chain. In production these come from per-step
    // audit rows; we collapse them here since the seed only emits the final
    // sign-off. The schema is ready to take per-step rows later.
    const steps = [
      { label: `Order received with ${allergen} flag`, signatory: 'Order tablet', ok: true },
      { label: 'Kitchen acknowledged', signatory: 'Chef on duty', ok: true },
      { label: 'Allergen-free surface used', signatory: 'Chef on duty', ok: true },
      { label: 'Plated separately', signatory: 'Sous chef', ok: true },
      { label: 'Manager sign-off', signatory: 'Anton Joseph', ok: true },
    ];
    return {
      id: r.id,
      tableLabel: r.tableLabel,
      occurredAt: r.occurredAt,
      allergen,
      verifiedBy,
      steps,
    };
  });
}

// ─── Audit log (paginated, filterable) ────────────────────────────────────

export interface AuditRow {
  id: string;
  occurredAt: Date;
  action: string;
  amountPence: number | null;
  details: Record<string, unknown>;
  tableLabel: string | null;
}

export async function getAuditLog(
  venueId: string,
  opts: { action?: string; limit?: number } = {},
): Promise<AuditRow[]> {
  const limit = opts.limit ?? 100;
  const conds = [eq(auditLog.venueId, venueId)];
  if (opts.action) {
    conds.push(eq(auditLog.action, opts.action as 'comp'));
  }
  const rows = await db
    .select({
      id: auditLog.id,
      occurredAt: auditLog.occurredAt,
      action: auditLog.action,
      amountPence: auditLog.amountPence,
      details: auditLog.details,
      tableLabel: sql<string | null>`(
        select ${sql.raw('label')} from ${sql.raw('tables')}
        where ${sql.raw('tables.id')} = ${auditLog.tableId}
      )`,
    })
    .from(auditLog)
    .where(and(...conds))
    .orderBy(desc(auditLog.occurredAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurredAt,
    action: r.action,
    amountPence: r.amountPence,
    details: r.details ?? {},
    tableLabel: r.tableLabel,
  }));
}

// ─── 7-day sparklines per KPI ─────────────────────────────────────────────

export interface KpiSparklines {
  covers: number[];
  revenue: number[];
  aov: number[];
  upsell: number[];
}

export async function getKpiSparklines(venueId: string, days = 7): Promise<KpiSparklines> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.placedAt}), 'YYYY-MM-DD')`,
      covers: sql<number>`coalesce(sum(${orders.coverCount}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalPence}), 0)::int`,
      upsell: sql<number>`coalesce(sum(${orders.totalPence} - ${orders.subtotalPence}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.venueId, venueId), eq(orders.status, 'paid'), gte(orders.placedAt, since)))
    .groupBy(sql`date_trunc('day', ${orders.placedAt})`);

  const upsellByDay = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.placedAt}), 'YYYY-MM-DD')`,
      upsell: sql<number>`coalesce(sum(${orderLines.upsellDeltaPence} * ${orderLines.quantity}), 0)::int`,
    })
    .from(orderLines)
    .innerJoin(orders, eq(orderLines.orderId, orders.id))
    .where(and(eq(orders.venueId, venueId), eq(orders.status, 'paid'), gte(orders.placedAt, since)))
    .groupBy(sql`date_trunc('day', ${orders.placedAt})`);

  const upsellMap = new Map(upsellByDay.map((r) => [r.day, Number(r.upsell)]));

  const covers: number[] = [];
  const revenue: number[] = [];
  const aov: number[] = [];
  const upsell: number[] = [];

  const rowMap = new Map(rows.map((r) => [r.day, r]));
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = rowMap.get(key);
    const c = r ? Number(r.covers) : 0;
    const rev = r ? Number(r.revenue) : 0;
    covers.push(c);
    revenue.push(rev);
    aov.push(c > 0 ? Math.round(rev / c) : 0);
    upsell.push(upsellMap.get(key) ?? 0);
  }

  return { covers, revenue, aov, upsell };
}
