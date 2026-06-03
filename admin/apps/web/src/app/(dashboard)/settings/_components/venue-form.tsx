'use client';

import { useActionState } from 'react';
import { updateVenue, type VenueFormState } from '@/app/actions/venue-actions';

interface Defaults {
  name: string;
  city: string | null;
  timezone: string;
  currency: string;
  recoveryBudgetPence: number;
}

export function VenueForm({ venueId, defaults }: { venueId: string; defaults: Defaults }) {
  const bound = updateVenue.bind(null, venueId);
  const [state, formAction, pending] = useActionState<VenueFormState, FormData>(bound, { ok: true });
  const errors = state.ok ? {} : state.errors;
  const values = state.ok ? null : state.values;
  const v = (k: keyof Defaults | 'recoveryBudgetGbp', fallback: string | number = '') => {
    if (values && k in values) return values[k as string] ?? '';
    if (k === 'recoveryBudgetGbp') return String(defaults.recoveryBudgetPence / 100);
    const val = defaults[k as keyof Defaults];
    return val === null || val === undefined ? String(fallback) : String(val);
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.ok && state.message ? (
        <div className="bg-oliveSoft border border-olive/30 text-olive text-sm px-3 py-2 rounded">
          {state.message}
        </div>
      ) : null}
      {errors._ ? (
        <div className="bg-red/10 border border-red/30 text-red text-sm px-3 py-2 rounded">{errors._}</div>
      ) : null}

      <Field label="Venue name" error={errors.name}>
        <input name="name" required defaultValue={v('name')} className={inputCls} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="City" error={errors.city}>
          <input name="city" defaultValue={v('city')} className={inputCls} placeholder="London" />
        </Field>
        <Field label="Timezone" error={errors.timezone}>
          <select name="timezone" defaultValue={v('timezone', 'Europe/London')} className={inputCls}>
            <option value="Europe/London">Europe/London (UK)</option>
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="Europe/Dublin">Europe/Dublin</option>
            <option value="America/New_York">America/New_York</option>
            <option value="UTC">UTC</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Currency" error={errors.currency}>
          <select name="currency" defaultValue={v('currency', 'GBP')} className={inputCls}>
            <option value="GBP">GBP — £ Pound sterling</option>
            <option value="EUR">EUR — € Euro</option>
            <option value="USD">USD — $ US dollar</option>
          </select>
        </Field>
        <Field
          label="Nightly recovery budget (£)"
          error={errors.recoveryBudgetGbp}
          help="Per SRS FR-SET-003. Manager App spend counts against this — once exceeded, comps need operator approval."
        >
          <input
            name="recoveryBudgetGbp"
            type="number"
            min="0"
            step="1"
            defaultValue={v('recoveryBudgetGbp')}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex justify-end items-center pt-4 border-t border-border gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-muted hover:text-ink px-4 py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-bg px-5 py-2 rounded font-medium hover:bg-text transition-colors disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'w-full px-3 py-2 bg-surface border border-border rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terra/30';

function Field({
  label,
  error,
  help,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="text-xs text-red mt-1 block">{error}</span> : null}
      {help ? <span className="text-xs text-muted italic mt-1 block">{help}</span> : null}
    </label>
  );
}
