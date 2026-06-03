import { SectionHead } from '@/components/section-head';
import { StatusCards } from './_components/status-cards';
import { AllergenChainCard } from './_components/allergen-chain-card';
import { AuditTable } from './_components/audit-table';
import { GdprCard } from './_components/gdpr-card';
import { RegulatoryExport } from './_components/regulatory-export';
import {
  getAllergenChains,
  getAuditLog,
  getComplianceStatus,
  getVenue,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const venue = await getVenue();
  if (!venue) return <div className="p-8 text-muted">No venue.</div>;

  const [status, chains, audit] = await Promise.all([
    getComplianceStatus(venue.id, venue.recoveryBudgetPence),
    getAllergenChains(venue.id, 7),
    getAuditLog(venue.id, { limit: 200 }),
  ]);

  return (
    <div className="p-8 max-w-[1600px] space-y-7">
      {/* 1. Status dashboard */}
      <section>
        <SectionHead
          eyebrow="Compliance status"
          title="Tonight's compliance dashboard"
          sub="Natasha's Law allergen chains · refusal log · recovery-budget burn · menu review status."
        />
        <StatusCards status={status} />
      </section>

      {/* 2. Allergen chains */}
      <section>
        <SectionHead
          eyebrow="Natasha's Law"
          title="Active allergen chains"
          sub={`${chains.length} table${chains.length === 1 ? '' : 's'} verified in the last 7 days · 5-step audit trail per chain · 7-year retention.`}
        />
        {chains.length === 0 ? (
          <div className="card text-center py-10 text-muted text-sm">
            No allergen-flagged tables in the last 7 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chains.map((c) => (
              <AllergenChainCard key={c.id} chain={c} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Audit log */}
      <section>
        <SectionHead
          eyebrow="Audit log"
          title="Tonight's actions"
          sub="Comps, voids, refusals, manager overrides, allergen sign-offs, recovery spend. Filterable, append-only."
        />
        <AuditTable rows={audit} />
      </section>

      {/* 4. GDPR + 5. Regulatory export */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GdprCard />
        <RegulatoryExport />
      </section>
    </div>
  );
}
