import { getRevenueSeries, getVenue } from '@/lib/queries';
import { StackedAreaChart } from '@/components/charts/stacked-area-chart';
import { gbp } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RevenuePage() {
  const venue = await getVenue();
  if (!venue) return <div className="p-10 text-muted">No venue. Run <code>pnpm db:seed</code>.</div>;

  const series = await getRevenueSeries(venue.id, 30);
  const totals = series.reduce(
    (acc, d) => ({ food: acc.food + d.food, drinks: acc.drinks + d.drinks, games: acc.games + d.games }),
    { food: 0, drinks: 0, games: 0 },
  );

  return (
    <div className="p-8 max-w-[1600px] space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted">Revenue</p>
        <h2 className="text-3xl font-serif text-ink">Last 30 days</h2>
      </header>
      <section className="grid grid-cols-3 gap-4">
        <div className="kpi"><span className="kpi-label">Food</span><span className="kpi-value">{gbp(totals.food)}</span></div>
        <div className="kpi"><span className="kpi-label">Drinks</span><span className="kpi-value">{gbp(totals.drinks)}</span></div>
        <div className="kpi kpi-monetised"><span className="kpi-label">Games (HG-monetised)</span><span className="kpi-value">{gbp(totals.games)}</span></div>
      </section>
      <div className="card">
        <StackedAreaChart data={series} />
      </div>
    </div>
  );
}
