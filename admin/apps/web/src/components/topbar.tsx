'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Plus } from 'lucide-react';
import { LiveRefresh } from './live-refresh';

type Range = 'today' | 'week' | 'month' | 'ytd';

const ROUTE_TITLES: Record<string, string> = {
  '/overview': 'Dashboard',
  '/revenue': 'Revenue',
  '/games': 'Games',
  '/upsell': 'Upsell engine',
  '/alerts': 'Service',
  '/servers': 'Team',
  '/menu': 'Menu & pricing',
  '/compliance': 'Compliance',
  '/settings': 'Settings',
};

const RANGES: Array<{ key: Range; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'ytd', label: 'YTD' },
];

export function TopBar({ venueId }: { venueId: string }) {
  const pathname = usePathname();
  const [range, setRange] = useState<Range>('today');

  const title =
    ROUTE_TITLES[pathname] ??
    (Object.entries(ROUTE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Admin');

  return (
    <header className="h-14 bg-surface border-b border-border px-8 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-xl font-serif text-ink font-medium tracking-tight">{title}</h1>

      <div className="flex items-center gap-2.5">
        {/* Range toggle */}
        <div className="bg-surface2 p-0.5 rounded-md flex items-center text-xs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={[
                'px-2.5 py-1 rounded transition-colors',
                range === r.key
                  ? 'bg-ink text-bg'
                  : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-surface text-xs text-text hover:bg-surface2 transition-colors"
        >
          <Download size={13} strokeWidth={1.75} />
          Export
        </button>

        {/* Live indicator (replaces the old floating pill) */}
        <LiveRefresh venueId={venueId} />

        {/* New report */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-ink text-bg text-xs font-medium hover:bg-text transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          New report
        </button>
      </div>
    </header>
  );
}
