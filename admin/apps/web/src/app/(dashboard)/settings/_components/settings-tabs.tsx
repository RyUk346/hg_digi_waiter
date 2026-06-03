'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TABS = [
  { key: 'venue', label: 'Venue' },
  { key: 'hours', label: 'Operating hours' },
  { key: 'recovery', label: 'Recovery budget' },
  { key: 'tax', label: 'Tax & service charge' },
  { key: 'payments', label: 'Payment gateway' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'users', label: 'Users' },
  { key: 'billing', label: 'Billing' },
  { key: 'notifications', label: 'Notifications' },
] as const;

export type SettingsTab = (typeof TABS)[number]['key'];

export function SettingsTabs() {
  const search = useSearchParams();
  const active = (search.get('tab') as SettingsTab) ?? 'venue';

  return (
    <nav className="w-56 shrink-0">
      <ul className="space-y-0.5">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={`/settings?tab=${t.key}`}
                className={[
                  'block px-3 py-2 rounded text-sm transition-colors',
                  isActive
                    ? 'bg-surface2 text-ink font-medium'
                    : 'text-text hover:bg-surface2/60',
                ].join(' ')}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
