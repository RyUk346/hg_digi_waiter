'use client';

import { useState, useTransition, useEffect } from 'react';
import { Trash2, AlertTriangle, Archive, CheckCircle2, X } from 'lucide-react';
import { deleteMenuItem, type DeleteResult } from '@/app/actions/menu-actions';

export function DeleteButton({
  id,
  name,
  orderCount,
}: {
  id: string;
  name: string;
  /** How many order_lines reference this item. Drives the modal copy. */
  orderCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${name}`}
        title="Delete"
        className="p-1.5 rounded text-muted hover:text-red hover:bg-red/10 transition-colors"
      >
        <Trash2 size={14} strokeWidth={1.75} />
      </button>
      {open ? (
        <DeleteModal id={id} name={name} orderCount={orderCount} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function DeleteModal({
  id,
  name,
  orderCount,
  onClose,
}: {
  id: string;
  name: string;
  orderCount: number;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DeleteResult | null>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  function confirm() {
    startTransition(async () => {
      const r = await deleteMenuItem(id);
      setResult(r);
    });
  }

  const willArchive = orderCount > 0;

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in"
      onClick={() => {
        if (!pending) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (top-right) */}
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
          <SuccessView result={result} name={name} onClose={onClose} />
        ) : (
          <ConfirmView
            name={name}
            willArchive={willArchive}
            orderCount={orderCount}
            pending={pending}
            error={result && !result.ok ? result.error : null}
            onConfirm={confirm}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}

function ConfirmView({
  name,
  willArchive,
  orderCount,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  name: string;
  willArchive: boolean;
  orderCount: number;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <span
          className={[
            'w-11 h-11 rounded-full flex items-center justify-center shrink-0',
            willArchive ? 'bg-amberSoft text-amber' : 'bg-red/10 text-red',
          ].join(' ')}
        >
          {willArchive ? (
            <Archive size={20} strokeWidth={1.75} />
          ) : (
            <AlertTriangle size={20} strokeWidth={1.75} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="delete-modal-title" className="font-serif text-xl text-ink leading-tight">
            {willArchive ? 'Archive this item?' : 'Delete this item?'}
          </h2>
          <p className="text-sm text-muted mt-1">
            <span className="text-ink font-medium">{name}</span>
          </p>
        </div>
      </div>

      <div
        className={[
          'mt-4 p-3.5 rounded-lg text-sm leading-snug',
          willArchive ? 'bg-amberSoft/40 text-text border border-amber/30' : 'bg-surface2 text-text',
        ].join(' ')}
      >
        {willArchive ? (
          <>
            This item appears on{' '}
            <strong className="text-ink">
              {orderCount} historical order{orderCount === 1 ? '' : 's'}
            </strong>
            . To preserve the audit and financial trail, it will be{' '}
            <strong className="text-ink">archived</strong> — removed from the menu list and the Order
            App, but kept in the database so past orders still resolve correctly.
          </>
        ) : (
          <>
            This item has never been ordered. It will be{' '}
            <strong className="text-ink">permanently deleted</strong> along with its upsell sequence
            and image file. This cannot be undone.
          </>
        )}
      </div>

      {error ? (
        <div className="mt-3 bg-red/10 border border-red/30 text-red text-sm px-3 py-2 rounded">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={[
            'inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50',
            willArchive
              ? 'bg-amber text-bg hover:bg-amber/90'
              : 'bg-red text-bg hover:bg-red/90',
          ].join(' ')}
        >
          {willArchive ? <Archive size={14} strokeWidth={2} /> : <Trash2 size={14} strokeWidth={2} />}
          {pending ? (willArchive ? 'Archiving…' : 'Deleting…') : willArchive ? 'Archive' : 'Delete permanently'}
        </button>
      </div>
    </div>
  );
}

function SuccessView({
  result,
  name,
  onClose,
}: {
  result: { ok: true; mode: 'deleted' | 'archived'; ordersAffected: number };
  name: string;
  onClose: () => void;
}) {
  const archived = result.mode === 'archived';
  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-full bg-oliveSoft text-olive flex items-center justify-center shrink-0">
          <CheckCircle2 size={20} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-xl text-ink leading-tight">
            {archived ? 'Archived' : 'Deleted'}
          </h2>
          <p className="text-sm text-muted mt-1">
            <span className="text-ink font-medium">{name}</span>
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-text">
        {archived
          ? `Hidden from the menu list. ${result.ordersAffected} past order${result.ordersAffected === 1 ? '' : 's'} kept intact.`
          : 'Permanently removed along with its upsell sequence and image file.'}
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
  );
}
