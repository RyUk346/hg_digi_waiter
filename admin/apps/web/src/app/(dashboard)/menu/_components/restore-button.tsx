'use client';

import { useState, useTransition, useEffect } from 'react';
import { Undo2, CheckCircle2, X } from 'lucide-react';
import { restoreMenuItem, type RestoreResult } from '@/app/actions/menu-actions';

export function RestoreButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Restore ${name}`}
        title="Restore to menu"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-olive/30 bg-oliveSoft text-olive hover:bg-olive hover:text-bg transition-colors"
      >
        <Undo2 size={12} strokeWidth={2} />
        Restore
      </button>
      {open ? <RestoreModal id={id} name={name} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function RestoreModal({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RestoreResult | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  function confirm() {
    startTransition(async () => {
      const r = await restoreMenuItem(id);
      setResult(r);
    });
  }

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in"
      onClick={() => {
        if (!pending) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
    >
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded text-muted hover:text-ink hover:bg-surface2 transition-colors disabled:opacity-50"
        >
          <X size={16} strokeWidth={2} />
        </button>

        {result?.ok ? (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <span className="w-11 h-11 rounded-full bg-oliveSoft text-olive flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-xl text-ink leading-tight">Restored</h2>
                <p className="text-sm text-muted mt-1">
                  <span className="text-ink font-medium">{result.name}</span> is back on the menu list.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-text">
              It&apos;s currently <span className="text-red font-medium">Out of stock</span> — flip the
              chip on the menu list to make it visible to guests.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-ink text-bg px-4 py-2 rounded text-sm font-medium hover:bg-text transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <span className="w-11 h-11 rounded-full bg-oliveSoft text-olive flex items-center justify-center shrink-0">
                <Undo2 size={20} strokeWidth={1.75} />
              </span>
              <div className="flex-1 min-w-0">
                <h2 id="restore-modal-title" className="font-serif text-xl text-ink leading-tight">
                  Restore this item?
                </h2>
                <p className="text-sm text-muted mt-1">
                  <span className="text-ink font-medium">{name}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 p-3.5 rounded-lg bg-surface2 text-sm text-text leading-snug">
              Returns to the menu list immediately. To prevent it going live to guests by accident, it
              comes back as <span className="text-red font-medium">Out of stock</span> — you&apos;ll
              need to flip the stock chip yourself to put it back on the Order App.
            </div>
            {result && !result.ok ? (
              <div className="mt-3 bg-red/10 border border-red/30 text-red text-sm px-3 py-2 rounded">
                {result.error}
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="inline-flex items-center gap-1.5 bg-olive text-bg px-4 py-2 rounded text-sm font-medium hover:bg-olive/90 transition-colors disabled:opacity-50"
              >
                <Undo2 size={14} strokeWidth={2} />
                {pending ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
