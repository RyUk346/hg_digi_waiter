import { auth } from '@/auth';
import { getVenue } from '@/lib/queries';
import { SectionHead } from '@/components/section-head';
import { SettingsTabs, type SettingsTab } from './_components/settings-tabs';
import { VenueForm } from './_components/venue-form';
import { gbp } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TAB_LABELS: Record<SettingsTab, { title: string; sub: string; srs: string }> = {
  venue: { title: 'Venue profile', sub: 'Name, location, currency, and nightly recovery budget.', srs: 'FR-SET-001 · FR-SET-003' },
  hours: { title: 'Operating hours', sub: 'Weekly schedule + holiday and private-event exceptions.', srs: 'FR-SET-002' },
  recovery: { title: 'Recovery budget detail', sub: '£200/night cap with usage tracking and overage approval flow.', srs: 'FR-SET-003' },
  tax: { title: 'Tax & service charge', sub: 'VAT rates per category and configurable service charge.', srs: 'FR-SET-004 · FR-SET-005' },
  payments: { title: 'Payment gateway', sub: 'Stripe Terminal account, currency, and accepted methods.', srs: 'FR-SET-006' },
  integrations: { title: 'Integrations', sub: 'OpenTable, Resy, accounting software OAuth connections.', srs: 'FR-SET-007' },
  users: { title: 'Users & roles', sub: 'Invite, deactivate, and assign roles. RBAC matrix in SRS §8.1.', srs: 'FR-SET-008' },
  billing: { title: 'Billing & subscription', sub: 'Current plan, invoices, payment method, usage vs caps.', srs: 'FR-SET-010' },
  notifications: { title: 'Notifications', sub: 'Per-user email, SMS, push, Slack-webhook preferences.', srs: 'FR-SET-009' },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const venue = await getVenue();
  if (!venue) return <div className="p-8 text-muted">No venue configured.</div>;

  const params = await searchParams;
  const tab = ((params.tab as SettingsTab) ?? 'venue') as SettingsTab;
  const meta = TAB_LABELS[tab] ?? TAB_LABELS.venue;

  return (
    <div className="p-8 max-w-[1400px]">
      <SectionHead eyebrow="Settings" title={meta.title} sub={meta.sub} />

      <div className="flex gap-8 mt-4">
        <SettingsTabs />

        <div className="flex-1 min-w-0 max-w-3xl">
          <div className="card p-8">
            {tab === 'venue' ? (
              <VenueForm
                venueId={venue.id}
                defaults={{
                  name: venue.name,
                  city: venue.city,
                  timezone: venue.timezone,
                  currency: venue.currency,
                  recoveryBudgetPence: venue.recoveryBudgetPence,
                }}
              />
            ) : (
              <Stub
                title={meta.title}
                description={meta.sub}
                srsRef={meta.srs}
                summary={summaryForTab(tab, venue)}
              />
            )}
          </div>

          <p className="text-xs text-muted mt-4 italic">
            Signed in as <span className="text-text font-medium">{session?.user?.name ?? session?.user?.email}</span> ·
            Operations Director
          </p>
        </div>
      </div>
    </div>
  );
}

function summaryForTab(tab: SettingsTab, venue: { recoveryBudgetPence: number; timezone: string; currency: string }) {
  switch (tab) {
    case 'recovery':
      return [
        { label: 'Nightly budget', value: gbp(venue.recoveryBudgetPence) },
        { label: 'Weekly budget', value: gbp(venue.recoveryBudgetPence * 7) },
        { label: 'Monthly budget', value: gbp(venue.recoveryBudgetPence * 30) },
      ];
    case 'hours':
      return [{ label: 'Timezone', value: venue.timezone }];
    case 'tax':
      return [{ label: 'Default VAT', value: '20% (UK standard)' }];
    case 'payments':
      return [{ label: 'Provider', value: 'Stripe Terminal' }, { label: 'Currency', value: venue.currency }];
    default:
      return [];
  }
}

function Stub({
  title,
  description,
  srsRef,
  summary,
}: {
  title: string;
  description: string;
  srsRef: string;
  summary: Array<{ label: string; value: string }>;
}) {
  return (
    <div>
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="text-sm text-muted italic mt-1">{description}</p>
      <p className="text-[11px] uppercase tracking-wide text-mutedSoft mt-3">SRS · {srsRef}</p>

      {summary.length > 0 ? (
        <dl className="mt-5 space-y-2">
          {summary.map((row) => (
            <div key={row.label} className="flex justify-between py-2 border-b border-borderSoft text-sm">
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-ink font-mono">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6 p-4 bg-surface2 rounded text-xs text-muted">
        <strong className="text-text">Coming next:</strong> Editable form for this section. Schema and queries are
        ready; only the UI is pending. Track in <code className="bg-surface px-1 rounded">docs/SRS-STATUS.md</code>.
      </div>
    </div>
  );
}
