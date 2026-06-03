'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { toggleItemAvailability } from '@/app/actions/menu-actions';

/**
 * Compact single-chip variant of the stock toggle, sized for the menu list
 * table. Click flips status in place — no page navigation, no modal.
 */
export function StockToggleInline({ id, inStock: initial }: { id: string; inStock: boolean }) {
  // Optimistic local state so the chip flips instantly while the server action runs.
  const [inStock, setInStock] = useState(initial);
  const [pending, startTransition] = useTransition();

  function flip() {
    const next = !inStock;
    setInStock(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      fd.set('available', String(next));
      await toggleItemAvailability(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending}
      aria-pressed={inStock}
      aria-label={inStock ? 'Mark out of stock' : 'Mark in stock'}
      title={inStock ? 'Click to mark out of stock' : 'Click to mark in stock'}
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
        'hover:shadow-sm disabled:opacity-60',
        inStock
          ? 'bg-oliveSoft text-olive border-olive/30 hover:bg-olive hover:text-bg'
          : 'bg-red/10 text-red border-red/30 hover:bg-red hover:text-bg',
      ].join(' ')}
    >
      {inStock ? (
        <Check size={11} strokeWidth={2.5} />
      ) : (
        <X size={11} strokeWidth={2.5} />
      )}
      {inStock ? 'In stock' : 'Out of stock'}
    </button>
  );
}
