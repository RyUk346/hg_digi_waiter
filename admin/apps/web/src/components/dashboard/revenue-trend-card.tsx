import { gbp } from '@/lib/format';
import { StackedAreaChart } from '@/components/charts/stacked-area-chart';
import type { RevenueDay } from '@/lib/queries';

export function RevenueTrendCard({ data }: { data: RevenueDay[] }) {
  const totals = data.reduce(
    (acc, d) => ({ food: acc.food + d.food, drinks: acc.drinks + d.drinks, games: acc.games + d.games }),
    { food: 0, drinks: 0, games: 0 },
  );
  const grand = totals.food + totals.drinks + totals.games;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 px-6 animate-fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">
            Last {data.length} days
          </p>
          <h3 className="font-serif text-lg text-ink mt-0.5">Revenue trend</h3>
        </div>
        <p className="font-serif text-2xl text-ink tabular-nums">{gbp(grand)}</p>
      </header>

      <StackedAreaChart data={data} />

      <div className="mt-3 pt-3 border-t border-borderSoft grid grid-cols-3 text-[11px] gap-3">
        <LegendRow color="#B8543D" label="Food" value={gbp(totals.food)} />
        <LegendRow color="#B8843D" label="Drinks" value={gbp(totals.drinks)} />
        <LegendRow color="#7B5DBA" label="Games" value={gbp(totals.games)} />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="font-mono text-text tabular-nums">{value}</span>
    </div>
  );
}
