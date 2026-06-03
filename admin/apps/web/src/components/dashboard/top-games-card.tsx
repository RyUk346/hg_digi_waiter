import { Brain, Heart, Type, Eye, Gamepad2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { gbp, num, pct } from '@/lib/format';
import type { TopGameRow } from '@/lib/queries';

const GAME_VISUALS: Record<string, { icon: LucideIcon; bg: string; fg: string }> = {
  'italian-trivia': { icon: Brain, bg: 'bg-amberSoft', fg: 'text-amber' },
  'couples-quiz': { icon: Heart, bg: 'bg-terraSoft', fg: 'text-rose' },
  'word-puzzles': { icon: Type, bg: 'bg-oliveSoft', fg: 'text-olive' },
  'spot-the-difference': { icon: Eye, bg: 'bg-surface3', fg: 'text-blue' },
};

export function TopGamesCard({ rows }: { rows: TopGameRow[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 px-6 animate-fade-in">
      <header className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-medium">Top by revenue</p>
        <h3 className="font-serif text-lg text-ink mt-0.5">Games this month</h3>
      </header>

      <ul>
        {rows.map((row, i) => {
          const v = GAME_VISUALS[row.slug] ?? { icon: Gamepad2, bg: 'bg-surface2', fg: 'text-text' };
          const Icon = v.icon;
          return (
            <li
              key={row.id}
              className={[
                'flex items-center gap-3 py-2.5',
                i < rows.length - 1 ? 'border-b border-borderSoft' : '',
              ].join(' ')}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${v.bg} ${v.fg}`}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{row.name}</p>
                <p className="text-[11px] text-muted">
                  {num(row.plays)} plays · {pct(row.replayRatePct, 0)} replay
                </p>
              </div>
              <span className="font-serif text-base text-ink tabular-nums">{gbp(row.revenuePence)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
