import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Gift,
  ShieldCheck,
  Ban,
  Hand,
  CheckCircle2,
  Gamepad2,
  AlertTriangle,
  Sparkles,
  Activity as ActivityIcon,
} from 'lucide-react';
import type { ActivityRow } from '@/lib/queries';

const ICONS: Record<ActivityRow['category'], LucideIcon> = {
  recovery: Gift,
  allergen: ShieldCheck,
  comp: Gift,
  refusal: Hand,
  sentiment: AlertTriangle,
  celebration: Sparkles,
  pacing: ActivityIcon,
  other: CheckCircle2,
};

const TINTS: Record<ActivityRow['severityTint'], { bg: string; fg: string }> = {
  terra: { bg: 'bg-terraSoft', fg: 'text-terraFg' },
  olive: { bg: 'bg-oliveSoft', fg: 'text-olive' },
  amber: { bg: 'bg-amberSoft', fg: 'text-amber' },
  red: { bg: 'bg-red/10', fg: 'text-red' },
  purple: { bg: 'bg-purple/10', fg: 'text-purple' },
};

export function ActivityFeedCard({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 px-6 animate-fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">Tonight</p>
          <h3 className="font-serif text-lg text-ink mt-0.5">Recent activity</h3>
        </div>
        <Link href="/compliance" className="text-[12px] text-terraFg hover:text-terra transition-colors">
          Full audit →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-muted py-4">No notable activity yet tonight.</p>
      ) : (
        <ul>
          {rows.map((row, i) => {
            const Icon = ICONS[row.category] ?? Gamepad2;
            const tint = TINTS[row.severityTint];
            const time = row.occurredAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return (
              <li
                key={row.id}
                className={[
                  'flex items-start gap-2.5 py-2.5',
                  i < rows.length - 1 ? 'border-b border-borderSoft' : '',
                ].join(' ')}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tint.bg} ${tint.fg}`}>
                  <Icon size={13} strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink leading-snug">{row.title}</p>
                  {row.meta ? (
                    <p className="text-[10.5px] text-muted leading-snug mt-0.5">{row.meta}</p>
                  ) : null}
                </div>
                <span className="font-mono text-[10px] text-mutedSoft pt-1 shrink-0">{time}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
