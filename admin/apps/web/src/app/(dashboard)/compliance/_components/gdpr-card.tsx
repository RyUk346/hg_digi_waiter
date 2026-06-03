'use client';

import { useState } from 'react';
import { UserX, Mail } from 'lucide-react';

interface GdprRequest {
  id: string;
  email: string;
  type: 'export' | 'deletion';
  requestedAt: Date;
  status: 'pending' | 'processing' | 'complete';
}

export function GdprCard() {
  const [requests] = useState<GdprRequest[]>([]); // No backing table yet
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg text-ink">GDPR requests</h3>
          <p className="text-sm text-muted italic mt-0.5">
            Right-to-be-forgotten (Art. 17) and data exports (Art. 20). 30-day SLA per UK GDPR.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 bg-ink text-bg px-3 py-1.5 rounded text-xs font-medium hover:bg-text transition-colors"
        >
          <Mail size={13} strokeWidth={2} />
          New request
        </button>
      </header>

      {requests.length === 0 ? (
        <div className="text-center py-10 px-4 bg-surface2 rounded">
          <UserX size={28} className="mx-auto text-muted mb-2" strokeWidth={1.5} />
          <p className="text-sm text-ink font-medium">No active requests</p>
          <p className="text-xs text-muted mt-1">
            New requests will appear here. SLA: 30 days; internal target 24 hours.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">{/* request rows */}</ul>
      )}

      {open ? (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-serif text-xl text-ink">Log a GDPR request</h4>
            <p className="text-xs text-muted mt-1">
              Schema for <code>gdpr_requests</code> isn&apos;t in the DB yet — the SRS calls for it
              (FR-COMP-005/006). This dialog is a stub.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted hover:text-ink px-3 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
