import { gbp, num, pct } from '@/lib/format';
import { Sparkline } from '@/components/charts/sparkline';
import type { KpiSnapshot, KpiSparklines } from '@/lib/queries';

interface Props {
  kpi: KpiSnapshot;
  spark: KpiSparklines;
}

export function KpiStrip({ kpi, spark }: Props) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <KpiCard
        label="Live covers"
        value={num(kpi.coversToday)}
        unit="tonight · target 60"
        delta={deltaVsPrev(spark.covers)}
        sparkline={spark.covers}
        sparklineColor="#42392F"
      />
      <KpiCard
        label="Revenue tonight"
        value={gbp(kpi.revenueTodayPence)}
        unit="vs last Friday"
        delta={deltaVsPrev(spark.revenue)}
        sparkline={spark.revenue}
        sparklineColor="#42392F"
      />
      <KpiCard
        label="Average order value"
        value={gbp(kpi.aovPence)}
        unit="per cover"
        delta={deltaVsPrev(spark.aov)}
        sparkline={spark.aov}
        sparklineColor="#42392F"
      />
      <KpiCard
        label="Upsell uplift"
        value={gbp(kpi.upsellRevenueTodayPence)}
        unit={`${pct(kpi.upsellAcceptanceRate, 0)} acceptance`}
        delta={deltaVsPrev(spark.upsell)}
        sparkline={spark.upsell}
        valueColor="terra"
        accentStripe
        sparklineColor="#B8543D"
      />
      <KpiCard
        label="Sentiment"
        value="4.4"
        unit="all tables · 5.0 max"
        delta={{ label: '+0.2', direction: 'up' }}
        sparkline={[4.1, 4.2, 4.3, 4.2, 4.4, 4.3, 4.4]}
        valueColor="olive"
        sparklineColor="#4A7C3F"
      />
    </section>
  );
}

function KpiCard({
  label,
  value,
  unit,
  delta,
  sparkline,
  sparklineColor,
  valueColor = 'ink',
  accentStripe,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: { label: string; direction: 'up' | 'down' };
  sparkline: number[];
  sparklineColor?: string;
  valueColor?: 'ink' | 'terra' | 'olive' | 'amber';
  accentStripe?: boolean;
}) {
  const valueCls =
    valueColor === 'terra'
      ? 'text-terraFg'
      : valueColor === 'olive'
        ? 'text-olive'
        : valueColor === 'amber'
          ? 'text-amber'
          : 'text-ink';
  return (
    <div
      className={[
        'relative bg-surface border border-border rounded-xl p-4 px-[18px] animate-fade-in',
        accentStripe ? 'pl-[21px]' : '',
      ].join(' ')}
    >
      {accentStripe ? <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-terra rounded-l-xl" /> : null}
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">{label}</span>
        {delta ? <DeltaPill {...delta} /> : null}
      </div>
      <p className={['font-serif text-3xl leading-none tabular-nums', valueCls].join(' ')}>{value}</p>
      {unit ? <p className="text-[11px] text-muted mt-1.5 italic">{unit}</p> : null}
      <div className="mt-2 -mx-1">
        <Sparkline data={sparkline} color={sparklineColor} width={180} height={26} />
      </div>
    </div>
  );
}

function DeltaPill({ label, direction }: { label: string; direction: 'up' | 'down' }) {
  return (
    <span
      className={[
        'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded',
        direction === 'up' ? 'bg-oliveSoft text-olive' : 'bg-red/10 text-red',
      ].join(' ')}
    >
      {direction === 'up' ? '▲' : '▼'} {label}
    </span>
  );
}

function deltaVsPrev(series: number[]): { label: string; direction: 'up' | 'down' } | undefined {
  if (series.length < 2) return undefined;
  const last = series[series.length - 1] ?? 0;
  const prev = series[series.length - 2] ?? 0;
  if (prev === 0) return undefined;
  const change = ((last - prev) / prev) * 100;
  if (Math.abs(change) < 0.5) return undefined;
  return { label: `${Math.abs(change).toFixed(0)}%`, direction: change >= 0 ? 'up' : 'down' };
}
