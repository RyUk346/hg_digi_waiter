import Link from 'next/link';
import { gbp } from '@/lib/format';
import type { TopUpsellRow } from '@/lib/queries';

export function TopUpsellsCard({ rows }: { rows: TopUpsellRow[] }) {
  // Normalise conversion against max so the bar is relative-to-leader
  const maxRevenue = rows.reduce((m, r) => Math.max(m, r.upsellRevenuePence), 0) || 1;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 px-6 animate-fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">This week</p>
          <h3 className="font-serif text-lg text-ink mt-0.5">Top converting upsells</h3>
        </div>
        <Link href="/upsell" className="text-[12px] text-terraFg hover:text-terra transition-colors">
          All upsells →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-muted py-4">No upsells accepted yet this week.</p>
      ) : (
        <ul>
          {rows.map((row, i) => {
            const widthPct = Math.max(8, Math.round((row.upsellRevenuePence / maxRevenue) * 100));
            return (
              <li
                key={row.sku}
                className={[
                  'py-2.5',
                  i < rows.length - 1 ? 'border-b border-borderSoft' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-ink truncate">{row.menuItemName}</p>
                  <p className="font-serif text-[15px] text-terraFg tabular-nums">{gbp(row.upsellRevenuePence)}</p>
                </div>
                <div className="mt-1.5 h-[5px] bg-surface2 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${widthPct}%`,
                      background: 'linear-gradient(90deg, #B8543D, #D17A65)',
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-1.5">
                  {row.acceptanceCount} accepted · added to bill
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
