'use client';

import { useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { toggleItemAvailability } from '@/app/actions/menu-actions';

/**
 * Big segmented toggle for the editor header. Two pills side-by-side;
 * clicking either flips the stored state immediately (separate Server Action,
 * not part of the form submit). Matches FR-MENU-008: changes reach the Order
 * App within 2 seconds.
 *
 * If no `id` is provided (i.e. on the New Item page where the item doesn't
 * exist yet) it falls back to controlled mode: the parent owns the state.
 */
export function StockToggle({
  id,
  inStock,
  onChange,
  size = 'md',
}: {
  id?: string;
  inStock: boolean;
  onChange?: (next: boolean) => void;
  size?: 'sm' | 'md';
}) {
  const [pending, startTransition] = useTransition();

  function setStock(next: boolean) {
    if (next === inStock) return;
    if (id) {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('id', id);
        fd.set('available', String(next));
        await toggleItemAvailability(fd);
      });
    }
    onChange?.(next);
  }

  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

  return (
    <div className="inline-flex items-stretch bg-surface2 p-0.5 rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setStock(true)}
        disabled={pending}
        aria-pressed={inStock}
        className={[
          'inline-flex items-center gap-1.5 rounded font-medium transition-all',
          padding,
          inStock
            ? 'bg-olive text-bg shadow-sm'
            : 'text-muted hover:text-ink',
        ].join(' ')}
      >
        <Check size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
        In stock
      </button>
      <button
        type="button"
        onClick={() => setStock(false)}
        disabled={pending}
        aria-pressed={!inStock}
        className={[
          'inline-flex items-center gap-1.5 rounded font-medium transition-all',
          padding,
          !inStock
            ? 'bg-red text-bg shadow-sm'
            : 'text-muted hover:text-ink',
        ].join(' ')}
      >
        <X size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
        Out of stock
      </button>
    </div>
  );
}
