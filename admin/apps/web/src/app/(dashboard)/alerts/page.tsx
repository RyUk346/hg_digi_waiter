import { getActiveAlerts, getVenue } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const venue = await getVenue();
  if (!venue) return <div className="p-10 text-muted">No venue.</div>;
  const rows = await getActiveAlerts(venue.id);

  return (
    <div className="p-8 max-w-[1200px] space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted">Alerts</p>
        <h2 className="text-3xl font-serif text-ink">{rows.length} open</h2>
      </header>
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="card flex items-start justify-between">
            <div>
              <p className={['font-medium', a.severity === 'critical' ? 'text-red' : a.severity === 'warning' ? 'text-amber' : a.severity === 'celebration' ? 'text-purple' : 'text-ink'].join(' ')}>
                {a.title}
              </p>
              {a.body ? <p className="text-sm text-muted mt-1">{a.body}</p> : null}
            </div>
            <span className="pill bg-surface2 text-muted capitalize">{a.severity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
