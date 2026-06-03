import { PlaysBarChart } from '@/components/charts/plays-bar-chart';
import type { GamesPlayDay } from '@/lib/queries';

export function GamesPlaysCard({ data }: { data: GamesPlayDay[] }) {
  const total = data.reduce((s, d) => s + d.plays, 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;
  const peakDay = data.reduce<GamesPlayDay | null>(
    (max, d) => (max && max.plays >= d.plays ? max : d),
    null,
  );

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 px-6 animate-fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">{data.length} days</p>
          <h3 className="font-serif text-lg text-ink mt-0.5">Plays per day</h3>
        </div>
        <p className="text-text">
          <span className="font-serif text-2xl text-ink tabular-nums">{avg}</span>{' '}
          <span className="text-xs text-muted">avg/day</span>
        </p>
      </header>

      <PlaysBarChart data={data} />

      <footer className="mt-3 pt-3 border-t border-borderSoft flex justify-between text-[11px] text-muted">
        <span>
          Peak:{' '}
          <span className="text-ink font-medium">
            {peakDay
              ? `${new Date(peakDay.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${peakDay.plays} plays`
              : '—'}
          </span>
        </span>
        <span>
          Total: <span className="text-ink font-medium">{total} plays</span>
        </span>
      </footer>
    </div>
  );
}
