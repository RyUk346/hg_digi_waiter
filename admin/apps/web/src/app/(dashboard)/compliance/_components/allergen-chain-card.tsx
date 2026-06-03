import { CheckCircle2, Circle } from 'lucide-react';
import type { AllergenChain } from '@/lib/queries';

export function AllergenChainCard({ chain }: { chain: AllergenChain }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <header className="flex items-center justify-between mb-4 pb-3 border-b border-borderSoft">
        <div className="flex items-center gap-2">
          {chain.tableLabel ? (
            <span className="pill bg-surface2 text-ink font-mono">Table {chain.tableLabel}</span>
          ) : null}
          <span className="pill bg-red/10 text-red font-medium uppercase">{chain.allergen}</span>
        </div>
        <span className="text-[11px] text-muted font-mono">
          {chain.occurredAt.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </header>

      <ol className="space-y-3">
        {chain.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={[
                'shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                step.ok ? 'text-olive' : 'text-muted',
              ].join(' ')}
            >
              {step.ok ? (
                <CheckCircle2 size={18} strokeWidth={2} />
              ) : (
                <Circle size={18} strokeWidth={1.75} />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink font-medium leading-snug">{step.label}</p>
              <p className="text-[11px] text-muted mt-0.5">{step.signatory}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[11px] text-muted italic mt-4 pt-3 border-t border-borderSoft">
        Verified by {chain.verifiedBy} · Natasha&apos;s Law audit trail · 7-year retention
      </p>
    </div>
  );
}
