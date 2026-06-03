import {
  getActivityFeed,
  getAovUplift,
  getGamesPlaysSeries,
  getGamesSplit,
  getKpiSnapshot,
  getKpiSparklines,
  getRevenueSeries,
  getServerLeaderboard,
  getTopGames,
  getTopUpsells,
  getVenue,
} from '@/lib/queries';
import { SectionHead } from '@/components/section-head';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { RevenueTrendCard } from '@/components/dashboard/revenue-trend-card';
import { HgImpactCard } from '@/components/dashboard/hg-impact-card';
import { GamesSplitCard } from '@/components/dashboard/games-split-card';
import { GamesPlaysCard } from '@/components/dashboard/games-plays-card';
import { TopGamesCard } from '@/components/dashboard/top-games-card';
import { TopUpsellsCard } from '@/components/dashboard/top-upsells-card';
import { ServerLeaderboardCard } from '@/components/dashboard/server-leaderboard-card';
import { ActivityFeedCard } from '@/components/dashboard/activity-feed-card';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const venue = await getVenue();
  if (!venue) {
    return (
      <div className="p-10">
        <h2 className="text-2xl font-serif">No venue found</h2>
        <p className="text-muted mt-2">
          Run <code className="bg-surface2 px-2 py-0.5 rounded">pnpm db:seed</code>.
        </p>
      </div>
    );
  }

  const [
    kpi,
    spark,
    revenue30d,
    uplift,
    gamesSplit,
    gamesPlays,
    topGames,
    topUpsells,
    leaderboard,
    activity,
  ] = await Promise.all([
    getKpiSnapshot(venue.id),
    getKpiSparklines(venue.id, 7),
    getRevenueSeries(venue.id, 30),
    getAovUplift(venue.id, 30),
    getGamesSplit(venue.id, 30),
    getGamesPlaysSeries(venue.id, 30),
    getTopGames(venue.id, 30),
    getTopUpsells(venue.id, 7),
    getServerLeaderboard(venue.id),
    getActivityFeed(venue.id, 6),
  ]);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-8 max-w-[1600px] space-y-7">
      {/* Section 1 — Snapshot */}
      <section>
        <SectionHead
          eyebrow="Tonight's snapshot"
          title={`Live performance · ${today}`}
          sub="Updates within seconds of device-app events · all figures from current shift"
          link={{ href: '/alerts', label: 'View live floor' }}
        />
        <KpiStrip kpi={kpi} spark={spark} />
      </section>

      {/* Section 2 — Revenue */}
      <section>
        <SectionHead
          eyebrow="30-day view"
          title="Revenue performance"
          sub="Food, drinks, and games revenue stacked · with HyperGlow attribution"
          link={{ href: '/revenue', label: 'Open revenue report' }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-5">
          <RevenueTrendCard data={revenue30d} />
          <HgImpactCard uplift={uplift} />
        </div>
      </section>

      {/* Section 3 — Games */}
      <section>
        <SectionHead
          eyebrow="Pay-per-play"
          title="Games revenue · 30 days"
          sub="Player payments split 80/20 between HyperGlow and Tavola per platform agreement"
          link={{ href: '/games', label: 'Open games report' }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr_1fr] gap-5">
          <GamesSplitCard split={gamesSplit} />
          <GamesPlaysCard data={gamesPlays} />
          <TopGamesCard rows={topGames} />
        </div>
      </section>

      {/* Section 4 — Deep dives */}
      <section>
        <SectionHead
          eyebrow="Deep dives"
          title="Performance details"
          sub="Drill into upsell conversion, server performance, and tonight's compliance"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <TopUpsellsCard rows={topUpsells} />
          <ServerLeaderboardCard rows={leaderboard} />
          <ActivityFeedCard rows={activity} />
        </div>
      </section>
    </div>
  );
}
