import { ArrowRight, Info, Zap } from 'lucide-react';
import { gbp, gbp2, pct } from '@/lib/format';
import type { AovUplift } from '@/lib/queries';

export function HgImpactCard({ uplift }: { uplift: AovUplift }) {
  return (
    <div
      className="rounded-2xl p-5 px-6 border border-terra/40 animate-fade-in"
      style={{ background: 'linear-gradient(135deg, #FAEDE5, #F8E0CC)' }}
    >
      <header>
        <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-terraFg font-medium">
          <Zap size={11} strokeWidth={2} />
          HyperGlow impact
        </p>
        <h3 className="font-serif text-xl text-ink mt-1">AOV uplift attribution</h3>
        <p className="text-xs text-text/70 italic mt-1">
          Modelled cover-by-cover vs no-upsell baseline · last {uplift.days} days
        </p>
      </header>

      {/* Comparison row */}
      <div className="mt-4 flex items-center gap-3">
        <AovTile label="Baseline AOV" value={gbp2(uplift.baselineAovPence)} sub="no upsell flow" />
        <ArrowRight size={20} className="text-terra shrink-0" strokeWidth={1.75} />
        <AovTile label="Actual AOV" value={gbp2(uplift.actualAovPence)} sub="with build sequences" valueColor="terra" />
      </div>

      {/* Summary */}
      <div className="mt-4 bg-surface rounded-xl p-3.5 border-l-[3px] border-terra">
        <p className="text-[10px] uppercase tracking-[0.14em] text-terraFg font-medium">
          {uplift.days}-day uplift
        </p>
        <p className="font-serif text-xl text-terraFg mt-1 leading-snug">
          {uplift.upliftPerCoverPence >= 0 ? '+' : ''}
          {gbp2(uplift.upliftPerCoverPence)} per cover · {uplift.upliftPct >= 0 ? '+' : ''}
          {pct(uplift.upliftPct, 0)}
        </p>
        <p className="text-xs text-text/70 mt-0.5">
          Attributable to upsell engine · {gbp(uplift.incrementalPence)} incremental over {uplift.days} days
        </p>
      </div>

      {/* Footnote */}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-text/70 leading-snug">
        <Info size={12} className="text-terra shrink-0 mt-0.5" strokeWidth={1.75} />
        Calculated by comparing each cover&apos;s actual spend to the baseline price of items they
        ordered, excluding upsell modifiers and cross-sells.
      </p>
    </div>
  );
}

function AovTile({
  label,
  value,
  sub,
  valueColor = 'ink',
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: 'ink' | 'terra';
}) {
  return (
    <div className="flex-1 bg-surface rounded-xl p-3.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">{label}</p>
      <p
        className={[
          'font-serif text-2xl tabular-nums mt-0.5',
          valueColor === 'terra' ? 'text-terraFg' : 'text-ink',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
    </div>
  );
}
