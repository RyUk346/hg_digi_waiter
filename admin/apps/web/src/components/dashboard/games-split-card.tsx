import { gbp, gbp2, num } from '@/lib/format';
import type { GamesSplit } from '@/lib/queries';

export function GamesSplitCard({ split }: { split: GamesSplit }) {
  const hgPct = Math.round(split.hyperglowPct * 100);
  const venuePct = 100 - hgPct;
  return (
    <div
      className="rounded-2xl p-5 px-[22px] border border-purple/30 animate-fade-in"
      style={{ background: 'linear-gradient(135deg, #ECE5F4, #F4F0FA)' }}
    >
      <header>
        <p className="text-[10px] uppercase tracking-[0.14em] text-purple font-medium">
          {split.rangeLabel} · running total
        </p>
        <h3 className="font-serif text-xl text-ink mt-1">Player payments</h3>
      </header>

      {/* Total + meta */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-serif text-[42px] leading-none text-ink tabular-nums">{gbp(split.totalPence)}</p>
        <p className="text-[11px] text-text/70 text-right pb-1.5 leading-snug">
          across {num(split.playCount)} game plays
          {split.uniqueTables > 0 ? <><br />{num(split.uniqueTables)} unique tables</> : null}
        </p>
      </div>

      {/* 80/20 split bar */}
      <div className="mt-4 h-9 rounded-lg overflow-hidden flex shadow-sm">
        <div
          className="bg-terra flex items-center justify-center text-[11px] font-semibold text-bg"
          style={{ flex: hgPct }}
        >
          HyperGlow · {hgPct}%
        </div>
        <div
          className="bg-purple flex items-center justify-center text-[11px] font-semibold text-bg"
          style={{ flex: venuePct }}
        >
          Tavola · {venuePct}%
        </div>
      </div>

      {/* Breakdown */}
      <ul className="mt-3 text-[12px]">
        <BreakdownRow color="#B8543D" label="HyperGlow platform fee" value={gbp2(split.hyperglowPence)} />
        <BreakdownRow color="#7B5DBA" label="Tavola venue share" value={gbp2(split.venuePence)} />
        <li className="flex items-center justify-between py-2 mt-1 border-t border-purple/20">
          <span className="text-muted">Avg per game play</span>
          <span className="font-mono text-text tabular-nums">
            {gbp2(split.playCount > 0 ? Math.round(split.totalPence / split.playCount) : 200)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function BreakdownRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between py-2 border-b border-purple/20">
      <span className="flex items-center gap-2 text-text">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="font-mono text-ink tabular-nums">{value}</span>
    </li>
  );
}
