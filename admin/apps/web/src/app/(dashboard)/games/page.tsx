import { db, games, gamePlays } from '@hyperglow/db';
import { getVenue } from '@/lib/queries';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { gbp, num } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function GamesPage() {
  const venue = await getVenue();
  if (!venue) return <div className="p-10 text-muted">No venue.</div>;

  const since = new Date(Date.now() - 30 * 86_400_000);

  const catalogue = await db.select().from(games);
  const stats = await db
    .select({
      gameId: gamePlays.gameId,
      plays: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${gamePlays.pricePence}), 0)::int`,
      hgShare: sql<number>`coalesce(sum(${gamePlays.pricePence} * ${gamePlays.hyperglowShareBps} / 10000), 0)::int`,
    })
    .from(gamePlays)
    .where(and(eq(gamePlays.venueId, venue.id), gte(gamePlays.playedAt, since)))
    .groupBy(gamePlays.gameId)
    .orderBy(desc(sql`coalesce(sum(${gamePlays.pricePence}), 0)`));

  const statsByGame = new Map(stats.map((s) => [s.gameId, s]));
  const total = stats.reduce((a, s) => a + s.revenue, 0);
  const hgTotal = stats.reduce((a, s) => a + s.hgShare, 0);

  return (
    <div className="p-8 max-w-[1400px] space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-terraFg">Games · HyperGlow monetised</p>
        <h2 className="text-3xl font-serif text-ink">Last 30 days</h2>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <div className="kpi kpi-monetised"><span className="kpi-label">Games revenue</span><span className="kpi-value">{gbp(total)}</span></div>
        <div className="kpi kpi-monetised"><span className="kpi-label">HyperGlow share (80%)</span><span className="kpi-value">{gbp(hgTotal)}</span></div>
        <div className="kpi"><span className="kpi-label">Venue share (20%)</span><span className="kpi-value">{gbp(total - hgTotal)}</span></div>
      </section>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">Game</th>
              <th className="text-left font-medium px-4 py-3">Duration</th>
              <th className="text-right font-medium px-4 py-3">Price</th>
              <th className="text-right font-medium px-4 py-3">Plays</th>
              <th className="text-right font-medium px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {catalogue.map((g) => {
              const s = statsByGame.get(g.id);
              return (
                <tr key={g.id} className="border-t border-border">
                  <td className="px-4 py-3 text-ink">
                    {g.name} {g.featured ? <span className="pill bg-terraSoft text-terraFg ml-2">featured</span> : null}
                  </td>
                  <td className="px-4 py-3 text-text">{g.durationSeconds}s</td>
                  <td className="px-4 py-3 text-right font-mono">{gbp(g.pricePence)}</td>
                  <td className="px-4 py-3 text-right">{s ? num(s.plays) : 0}</td>
                  <td className="px-4 py-3 text-right font-mono text-terraFg">{s ? gbp(s.revenue) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
