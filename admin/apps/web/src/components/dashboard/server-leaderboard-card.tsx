import Link from 'next/link';
import { gbp, num, pct } from '@/lib/format';
import type { ServerLeaderRow } from '@/lib/queries';

export function ServerLeaderboardCard({ rows }: { rows: ServerLeaderRow[] }) {
  const teamAvg =
    rows.length > 0 ? rows.reduce((s, r) => s + r.upsellRate, 0) / rows.length : 0;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 px-6 animate-fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">This week</p>
          <h3 className="font-serif text-lg text-ink mt-0.5">Server performance</h3>
        </div>
        <Link href="/servers" className="text-[12px] text-terraFg hover:text-terra transition-colors">
          All servers →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-muted py-4">No servers yet.</p>
      ) : (
        <ul>
          {rows.slice(0, 5).map((row, i) => {
            const isFirst = i === 0;
            const coachingAlert = row.upsellRate > 0 && row.upsellRate < teamAvg - 0.15;
            const initials = row.name
              .split(' ')
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <li
                key={row.id}
                className={[
                  'flex items-center gap-3 py-2.5',
                  i < Math.min(rows.length, 5) - 1 ? 'border-b border-borderSoft' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-5 font-mono text-[11px] text-right',
                    isFirst ? 'text-terraFg font-semibold' : 'text-muted',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold',
                    isFirst ? 'bg-terraSoft text-terraFg' : 'bg-surface2 text-ink',
                  ].join(' ')}
                >
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink truncate">{row.name}</p>
                  <p
                    className={[
                      'text-[10px]',
                      coachingAlert ? 'text-amber font-medium' : 'text-muted',
                    ].join(' ')}
                  >
                    {pct(row.upsellRate, 0)} upsell · {num(row.covers)} covers
                    {coachingAlert ? ' · coaching alert' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={[
                      'font-serif text-[15px] tabular-nums',
                      isFirst ? 'text-terraFg' : 'text-ink',
                    ].join(' ')}
                  >
                    {gbp(row.revenuePence)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
