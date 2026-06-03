import { ShieldCheck, Hand, Heart, BookOpen } from 'lucide-react';
import { gbp, pct } from '@/lib/format';
import type { ComplianceStatus } from '@/lib/queries';

export function StatusCards({ status }: { status: ComplianceStatus }) {
  const budgetUsedPct =
    status.recoveryBudgetTotalPence > 0
      ? status.recoveryBudgetSpentPence / status.recoveryBudgetTotalPence
      : 0;
  const budgetTint =
    budgetUsedPct >= 1 ? 'red' : budgetUsedPct >= 0.9 ? 'amber' : budgetUsedPct >= 0.75 ? 'amber' : 'olive';
  const reviewTint = status.menuAllergenReviewPct >= 0.95 ? 'olive' : 'red';
  const refusalTint = status.refusalsThisWeek > 5 ? 'amber' : 'olive';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatusCard
        icon={ShieldCheck}
        label="Allergen chains"
        value={String(status.allergenChainsThisWeek)}
        sub="this week"
        tint="olive"
      />
      <StatusCard
        icon={Hand}
        label="Refusals of service"
        value={String(status.refusalsThisWeek)}
        sub="this week"
        tint={refusalTint}
      />
      <StatusCard
        icon={Heart}
        label="Recovery budget remaining"
        value={gbp(status.recoveryBudgetRemainingPence)}
        sub={`${pct(budgetUsedPct, 0)} used today · ${gbp(status.recoveryBudgetTotalPence)} cap`}
        tint={budgetTint}
        progressPct={budgetUsedPct}
      />
      <StatusCard
        icon={BookOpen}
        label="Menu allergen review"
        value={pct(status.menuAllergenReviewPct, 0)}
        sub={`${status.menuItemsWithAllergens} of ${status.menuItemsTotal} items tagged`}
        tint={reviewTint}
      />
    </div>
  );
}

const TINTS = {
  olive: { bg: 'bg-oliveSoft', fg: 'text-olive', bar: 'bg-olive' },
  amber: { bg: 'bg-amberSoft', fg: 'text-amber', bar: 'bg-amber' },
  red: { bg: 'bg-red/10', fg: 'text-red', bar: 'bg-red' },
} as const;

function StatusCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
  progressPct,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  sub: string;
  tint: keyof typeof TINTS;
  progressPct?: number;
}) {
  const t = TINTS[tint];
  return (
    <div className="bg-surface border border-border rounded-xl p-4 px-[18px]">
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.bg} ${t.fg}`}>
          <Icon size={14} strokeWidth={1.75} />
        </span>
      </div>
      <p className="font-serif text-3xl text-ink mt-2 tabular-nums">{value}</p>
      <p className="text-[11px] text-muted mt-1.5 italic">{sub}</p>
      {typeof progressPct === 'number' ? (
        <div className="mt-2 h-1 bg-surface2 rounded">
          <div
            className={`h-full rounded transition-all ${t.bar}`}
            style={{ width: `${Math.min(100, Math.round(progressPct * 100))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
