'use client';

import { useState, useTransition } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { createCategory } from '@/app/actions/menu-actions';

export interface CategoryOption {
  id: string;
  name: string;
}

/**
 * Category dropdown with an inline "+ New category" affordance.
 * When the user types a new name and confirms, calls createCategory()
 * which inserts into Postgres and returns the new row. The dropdown then
 * auto-selects it. No page refresh required.
 */
export function CategorySelector({
  name,
  initial,
  defaultValue,
}: {
  name: string;
  initial: CategoryOption[];
  defaultValue?: string | null;
}) {
  const [categories, setCategories] = useState(initial);
  const [selected, setSelected] = useState(defaultValue ?? '');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const value = draft.trim();
    if (!value) {
      setError('Name required');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCategory(value);
      if (result.ok) {
        setCategories((prev) => [...prev, result.category]);
        setSelected(result.category.id);
        setDraft('');
        setAdding(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (adding) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === 'Escape') {
                setAdding(false);
                setDraft('');
                setError(null);
              }
            }}
            autoFocus
            placeholder="e.g. Cocktails, Vegan, Sides"
            className="flex-1 px-3 py-2 bg-surface border border-terra/40 ring-2 ring-terra/20 rounded text-sm text-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending}
            aria-label="Create category"
            className="p-2 bg-ink text-bg rounded hover:bg-text transition-colors disabled:opacity-50"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setDraft('');
              setError(null);
            }}
            aria-label="Cancel"
            className="p-2 border border-border text-muted rounded hover:bg-surface2 transition-colors"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
        {/* Stay submittable to the parent form by emitting the eventual value */}
        <input type="hidden" name={name} value={selected} />
        {error ? <p className="text-xs text-red">{error}</p> : null}
        <p className="text-[11px] text-muted italic">Enter to save, Escape to cancel.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        name={name}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="flex-1 px-3 py-2 bg-surface2 border border-border rounded text-ink focus:outline-none focus:ring-2 focus:ring-terra/30"
      >
        <option value="">— Uncategorised —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="inline-flex items-center gap-1 px-2.5 py-2 border border-border text-text rounded hover:bg-surface2 hover:text-ink transition-colors text-xs whitespace-nowrap"
        title="Create new category"
      >
        <Plus size={13} strokeWidth={2} />
        New
      </button>
    </div>
  );
}
