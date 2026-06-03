import { getServerLeaderboard, getVenue } from '@/lib/queries';
import { gbp, num, pct } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ServersPage() {
  const venue = await getVenue();
  if (!venue) return <div className="p-10 text-muted">No venue.</div>;
  const rows = await getServerLeaderboard(venue.id);

  return (
    <div className="p-8 max-w-[1200px] space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted">Servers</p>
        <h2 className="text-3xl font-serif text-ink">Week leaderboard</h2>
        <p className="text-sm text-muted mt-1">Upsell acceptance is the primary HyperGlow performance metric.</p>
      </header>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-3">#</th>
              <th className="text-left font-medium px-4 py-3">Name</th>
              <th className="text-right font-medium px-4 py-3">Upsell rate</th>
              <th className="text-right font-medium px-4 py-3">Covers</th>
              <th className="text-right font-medium px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted">{i + 1}</td>
                <td className="px-4 py-3 text-ink">{s.name}</td>
                <td className="px-4 py-3 text-right font-mono text-terraFg">{pct(s.upsellRate, 0)}</td>
                <td className="px-4 py-3 text-right">{num(s.covers)}</td>
                <td className="px-4 py-3 text-right font-mono">{gbp(s.revenuePence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
