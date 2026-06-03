'use client';

import { useState } from 'react';
import { FileDown, Lock } from 'lucide-react';

export function RegulatoryExport() {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);

  function handleGenerate() {
    setGenerating(true);
    // Stub — real impl would POST to /api/compliance/export and stream a download
    setTimeout(() => {
      setGenerating(false);
      alert(`Stub: generate ${format.toUpperCase()} audit pack from ${from} to ${to}.\n\nReal export requires the HMAC-signing pipeline (NFR-SEC-010, not yet built).`);
    }, 600);
  }

  return (
    <div className="card">
      <header className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-terraSoft text-terraFg flex items-center justify-center shrink-0">
            <Lock size={16} strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="font-serif text-lg text-ink">Regulatory audit pack</h3>
            <p className="text-sm text-muted italic mt-0.5">
              Tamper-evident export of the audit log, allergen chains, refusal records, and compliance
              metadata. HMAC-signed; ready for regulator submission.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted font-medium">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded text-sm text-ink"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted font-medium">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded text-sm text-ink"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted font-medium">Format</span>
          <div className="mt-1 bg-surface2 p-0.5 rounded flex text-xs">
            {(['pdf', 'csv', 'json'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={[
                  'flex-1 px-3 py-1.5 rounded transition-colors uppercase',
                  format === f ? 'bg-ink text-bg' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 bg-ink text-bg px-4 py-2 rounded text-sm font-medium hover:bg-text transition-colors disabled:opacity-50"
        >
          <FileDown size={14} strokeWidth={2} />
          {generating ? 'Generating…' : 'Generate audit pack'}
        </button>
      </div>
    </div>
  );
}
