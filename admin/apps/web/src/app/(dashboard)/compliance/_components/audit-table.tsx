'use client';

import { useState } from 'react';
import type { AuditRow } from '@/lib/queries';
import { gbp } from '@/lib/format';

const TAGS: Record<string, { label: string; cls: string }> = {
  comp: { label: 'COMP', cls: 'bg-terraSoft text-terraFg' },
  refusal_of_service: { label: 'REFUSAL', cls: 'bg-red/10 text-red' },
  void: { label: 'VOID', cls: 'bg-amberSoft text-amber' },
  manager_override: { label: 'OVERRIDE', cls: 'bg-surface2 text-text' },
  allergen_signoff: { label: 'VERIFIED', cls: 'bg-oliveSoft text-olive' },
  recovery_spend: { label: 'RECOVERY', cls: 'bg-terraSoft text-terraFg' },
  shift_handover: { label: 'HANDOVER', cls: 'bg-surface3 text-muted' },
};

const FILTERS: Array<{ key: string | null; label: string }> = [
  { key: null, label: 'All' },
  { key: 'comp', label: 'Comps' },
  { key: 'refusal_of_service', label: 'Refusals' },
  { key: 'void', label: 'Voids' },
  { key: 'manager_override', label: 'Overrides' },
  { key: 'allergen_signoff', label: 'Allergen' },
  { key: 'recovery_spend', label: 'Recovery' },
];

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? rows.filter((r) => r.action === filter) : rows;

  return (
    <div className="card p-0">
      <div className="flex gap-1 p-3 border-b border-border overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              'px-3 py-1 rounded text-xs whitespace-nowrap transition-colors',
              filter === f.key
                ? 'bg-ink text-bg font-medium'
                : 'text-muted hover:bg-surface2 hover:text-ink',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-muted px-2">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">When</th>
              <th className="text-left font-medium px-4 py-3">Tag</th>
              <th className="text-left font-medium px-4 py-3">Action</th>
              <th className="text-left font-medium px-4 py-3">Table</th>
              <th className="text-right font-medium px-4 py-3">Amount</th>
              <th className="text-left font-medium px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No entries for this filter.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const tag = TAGS[r.action] ?? { label: r.action.toUpperCase(), cls: 'bg-surface2 text-text' };
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted whitespace-nowrap font-mono text-xs">
                      {r.occurredAt.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`pill ${tag.cls} font-mono`}>{tag.label}</span>
                    </td>
                    <td className="px-4 py-2 text-ink capitalize">{r.action.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-text font-mono text-xs">{r.tableLabel ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.amountPence ? gbp(r.amountPence) : '—'}</td>
                    <td className="px-4 py-2 text-text font-mono text-[11px]">
                      {Object.keys(r.details).length > 0 ? JSON.stringify(r.details) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
